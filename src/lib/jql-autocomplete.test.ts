import { describe, expect, it } from 'vitest'
import { applyJqlSuggestion, suggestJqlTokens } from './jql-autocomplete'
import type { JqlFieldMetadata } from '@/types/jql.types'

const FIELDS: JqlFieldMetadata[] = [
  {
    field: 'priority',
    label: 'Priority',
    operators: ['=', '!=', 'in', 'not in'],
    valueType: 'enum',
    hasDynamicValues: false,
  },
  {
    field: 'status',
    label: 'Status',
    operators: ['=', '!=', 'in', 'not in'],
    valueType: 'text',
    hasDynamicValues: true,
  },
  {
    field: 'assignee',
    label: 'Assignee',
    operators: ['=', '!='],
    valueType: 'objectId',
    hasDynamicValues: false,
  },
  {
    field: 'dueDate',
    label: 'Due date',
    operators: ['=', '!=', '>', '>=', '<', '<='],
    valueType: 'date',
    hasDynamicValues: false,
  },
]
const KEYWORDS = ['AND', 'OR', 'NOT', 'IN', 'ORDER BY', 'ASC', 'DESC', 'currentUser()']

describe('suggestJqlTokens', () => {
  it('suggests every field at the very start of a query', () => {
    const suggestions = suggestJqlTokens('', FIELDS, KEYWORDS, {})
    expect(suggestions.map((s) => s.text)).toEqual(['priority', 'status', 'assignee', 'dueDate'])
    expect(suggestions.every((s) => s.kind === 'field')).toBe(true)
  })

  it('filters field suggestions by the partial word typed so far', () => {
    const suggestions = suggestJqlTokens('stat', FIELDS, KEYWORDS, {})
    expect(suggestions.map((s) => s.text)).toEqual(['status'])
  })

  it('suggests fields again right after AND/OR/NOT', () => {
    expect(suggestJqlTokens('priority = P1 AND ', FIELDS, KEYWORDS, {}).map((s) => s.text)).toEqual(
      ['priority', 'status', 'assignee', 'dueDate'],
    )
  })

  it("suggests a field's valid operators once the field name is fully typed", () => {
    const suggestions = suggestJqlTokens('priority ', FIELDS, KEYWORDS, {})
    expect(suggestions).toEqual([
      { kind: 'operator', text: '=' },
      { kind: 'operator', text: '!=' },
      { kind: 'operator', text: 'in' },
      { kind: 'operator', text: 'not in' },
    ])
  })

  it('suggests static enum values for priority after "="', () => {
    const suggestions = suggestJqlTokens('priority = ', FIELDS, KEYWORDS, {})
    expect(suggestions).toEqual([
      { kind: 'value', text: 'P1' },
      { kind: 'value', text: 'P2' },
      { kind: 'value', text: 'P3' },
    ])
  })

  it('suggests dynamic values fetched for the current field', () => {
    const suggestions = suggestJqlTokens('status = ', FIELDS, KEYWORDS, {
      status: ['Todo', 'Done'],
    })
    expect(suggestions).toEqual([
      { kind: 'value', text: 'Todo' },
      { kind: 'value', text: 'Done' },
    ])
  })

  it('suggests currentUser() for assignee/createdBy', () => {
    const suggestions = suggestJqlTokens('assignee = ', FIELDS, KEYWORDS, {})
    expect(suggestions).toEqual([{ kind: 'value', text: 'currentUser()' }])
  })

  it('looks back past "NOT" to find the field for "field NOT IN ("', () => {
    const suggestions = suggestJqlTokens('status NOT IN ', FIELDS, KEYWORDS, {
      status: ['Todo', 'Done'],
    })
    expect(suggestions.map((s) => s.text)).toEqual(['Todo', 'Done'])
  })

  it('falls back to keyword suggestions once a value has started', () => {
    const suggestions = suggestJqlTokens('priority = P1 OR', FIELDS, KEYWORDS, {})
    expect(suggestions.map((s) => s.text)).toEqual(['OR', 'ORDER BY'])
  })

  it('returns no value suggestions for an objectId field with no dynamic source and not a currentUser field', () => {
    expect(suggestJqlTokens('dueDate = ', FIELDS, KEYWORDS, {})).toEqual([])
  })
})

describe('applyJqlSuggestion', () => {
  it('appends the suggestion with a trailing space when the input is empty', () => {
    expect(applyJqlSuggestion('', 'priority')).toBe('priority ')
  })

  it('appends the suggestion when the input already ends with whitespace', () => {
    expect(applyJqlSuggestion('priority = P1 AND ', 'status')).toBe('priority = P1 AND status ')
  })

  it('replaces the trailing partial word, keeping everything before it', () => {
    expect(applyJqlSuggestion('priority = P1 AND stat', 'status')).toBe('priority = P1 AND status ')
  })
})
