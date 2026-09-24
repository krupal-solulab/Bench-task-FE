import type { JqlFieldMetadata } from '@/types/jql.types'

export interface JqlSuggestion {
  kind: 'field' | 'operator' | 'value' | 'keyword'
  text: string
}

const CONNECTOR_WORDS = new Set(['AND', 'OR', 'NOT', '(', 'BY'])
const OPERATOR_SYMBOLS = new Set(['=', '!=', '~', '>', '>=', '<', '<=', 'IN'])

const STATIC_ENUM_VALUES: Record<string, string[]> = {
  priority: ['P1', 'P2', 'P3'],
  statusCategory: ['To Do', 'In Progress', 'Done'],
}

/** Fields whose value suggestions are best expressed as `currentUser()` rather than a raw id -
 * the frontend already resolves this specially since typing a real id by hand isn't realistic. */
const CURRENT_USER_FIELDS = new Set(['assignee', 'createdBy'])

function fieldByName(fields: JqlFieldMetadata[], name: string): JqlFieldMetadata | undefined {
  return fields.find((f) => f.field.toLowerCase() === name.toLowerCase())
}

/** Splits `input` into (everything before the trailing partial word, the partial word itself),
 * treating a trailing-space input as having an empty partial (the next token hasn't started). */
function splitTrailingPartial(input: string): { priorWords: string[]; partial: string } {
  const endsWithSpace = /\s$/.test(input)
  const words = input.split(/\s+/).filter(Boolean)
  const partial = endsWithSpace ? '' : (words.pop() ?? '')
  return { priorWords: words, partial }
}

/**
 * If `input` currently ends right after a recognized field's operator (e.g. `"priority = "` or
 * `"status NOT IN "`), returns that field's metadata - used both to decide which value
 * suggestions to offer and, by the caller, which field to fetch dynamic values for. Returns
 * undefined for every other position (start of clause, mid-field-name, mid-value, ...).
 */
export function detectValuePositionField(
  input: string,
  fields: JqlFieldMetadata[],
): JqlFieldMetadata | undefined {
  const { priorWords } = splitTrailingPartial(input)
  const last = priorWords[priorWords.length - 1]
  if (!last || !OPERATOR_SYMBOLS.has(last.toUpperCase())) return undefined
  const beforeOperator = priorWords[priorWords.length - 2]
  const fieldName =
    beforeOperator?.toUpperCase() === 'NOT' ? priorWords[priorWords.length - 3] : beforeOperator
  return fieldName ? fieldByName(fields, fieldName) : undefined
}

/**
 * Module 4's JQL autocomplete - a deliberately simple, end-of-string-aware suggester (not a full
 * caret-position-aware editor, which would need measuring text layout inside a `<textarea>` -
 * notoriously fiddly without a code-editor library, none of which is installed in this codebase).
 * Suggests fields at the start of a clause, operators once a known field is typed, and values
 * once a known operator is typed - filtered by whatever partial word is being typed. Splitting on
 * whitespace means it won't perfectly track position inside a multi-value `IN (...)` list or a
 * quoted string containing spaces - an accepted scope simplification for the common,
 * left-to-right typing flow this is built for.
 */
export function suggestJqlTokens(
  input: string,
  fields: JqlFieldMetadata[],
  keywords: string[],
  dynamicValuesByField: Record<string, string[]>,
): JqlSuggestion[] {
  const { priorWords, partial } = splitTrailingPartial(input)
  const last = priorWords[priorWords.length - 1]
  const lastUpper = last?.toUpperCase()

  const matchesPartial = (candidate: string) =>
    candidate.toLowerCase().startsWith(partial.toLowerCase())

  // Start of a clause: nothing typed yet, or the last word is a connector/opening keyword.
  if (!last || (lastUpper && CONNECTOR_WORDS.has(lastUpper))) {
    return fields
      .filter((f) => matchesPartial(f.field))
      .map((f) => ({ kind: 'field', text: f.field }))
  }

  // Right after a recognized field name: suggest that field's valid operators.
  const asField = fieldByName(fields, last)
  if (asField) {
    return asField.operators.filter(matchesPartial).map((op) => ({ kind: 'operator', text: op }))
  }

  // Right after an operator (or "IN"/"NOT IN"): suggest values for the field two-or-three words back.
  if (lastUpper && OPERATOR_SYMBOLS.has(lastUpper)) {
    const field = detectValuePositionField(input, fields)
    if (!field) return []

    const values: string[] = [
      ...(STATIC_ENUM_VALUES[field.field] ?? []),
      ...(field.hasDynamicValues ? (dynamicValuesByField[field.field] ?? []) : []),
      ...(CURRENT_USER_FIELDS.has(field.field) ? ['currentUser()'] : []),
    ]
    return values.filter(matchesPartial).map((v) => ({ kind: 'value', text: v }))
  }

  // Otherwise a value (or something else) is mid-typing - offer to continue the query.
  return keywords.filter(matchesPartial).map((k) => ({ kind: 'keyword', text: k }))
}

/** Replaces the trailing partial word of `input` with `suggestion`, leaving everything before it
 * untouched, and appends a trailing space so the next token starts cleanly. */
export function applyJqlSuggestion(input: string, suggestion: string): string {
  const endsWithSpace = /\s$/.test(input)
  if (endsWithSpace || input === '') return `${input}${suggestion} `
  const lastSpace = input.lastIndexOf(' ')
  const prefix = lastSpace === -1 ? '' : input.slice(0, lastSpace + 1)
  return `${prefix}${suggestion} `
}
