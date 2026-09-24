import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Textarea } from '@/components/ui/textarea'
import { useJqlAutocompleteFields, useJqlAutocompleteValues } from '@/hooks/queries/useTasks'
import {
  applyJqlSuggestion,
  detectValuePositionField,
  suggestJqlTokens,
} from '@/lib/jql-autocomplete'

export interface AdvancedSearchInputProps {
  /** The currently-active (submitted) query, or null if none - controls whether "Clear" shows. */
  activeQuery: string | null
  onSearch: (jql: string) => void
  onClear: () => void
  isLoading?: boolean
  error?: string
}

const EXAMPLE = 'status != Done AND priority = P1 AND assignee = currentUser() ORDER BY dueDate'

/** Opt-in JQL-lite compound search (Search/Dashboards v2), a sibling mode to the fixed-shape
 * TaskFilters rather than a replacement for it - a plain text query, submitted explicitly (not
 * fired per keystroke), so a partial/invalid query never triggers a request while typing. */
export function AdvancedSearchInput({
  activeQuery,
  onSearch,
  onClear,
  isLoading,
  error,
}: AdvancedSearchInputProps) {
  const [draft, setDraft] = useState(activeQuery ?? '')

  // Module 4's JQL autocomplete - see jql-autocomplete.ts's own doc comment for why this is an
  // end-of-string suggester rather than a caret-position-aware one.
  const { data: metadata } = useJqlAutocompleteFields()
  const valueField = metadata ? detectValuePositionField(draft, metadata.fields) : undefined
  const { data: dynamicValues } = useJqlAutocompleteValues(
    valueField?.hasDynamicValues ? valueField.field : null,
  )
  const suggestions = metadata
    ? suggestJqlTokens(
        draft,
        metadata.fields,
        metadata.keywords,
        valueField && dynamicValues ? { [valueField.field]: dynamicValues } : {},
      )
    : []

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (draft.trim()) onSearch(draft.trim())
  }

  function handleClear() {
    setDraft('')
    onClear()
  }

  function applySuggestion(text: string) {
    setDraft((prev) => applyJqlSuggestion(prev, text))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-md border p-3">
      <label htmlFor="advanced-search-jql" className="text-sm font-medium">
        Advanced search
      </label>
      <Textarea
        id="advanced-search-jql"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={EXAMPLE}
        rows={2}
        className="font-mono text-sm"
      />
      {suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Suggestions:</span>
          {suggestions.slice(0, 12).map((s) => (
            <button
              key={`${s.kind}-${s.text}`}
              type="button"
              onClick={() => applySuggestion(s.text)}
              className="rounded-full border bg-muted/50 px-2 py-0.5 font-mono text-xs hover:bg-accent"
            >
              {s.text}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          e.g. <code>{EXAMPLE}</code>
        </p>
        <div className="flex gap-2">
          {activeQuery && (
            <Button type="button" variant="outline" size="sm" onClick={handleClear}>
              <X className="h-4 w-4" /> Clear
            </Button>
          )}
          <Button type="submit" size="sm" loading={isLoading} disabled={!draft.trim()}>
            <Search className="h-4 w-4" /> Search
          </Button>
        </div>
      </div>
    </form>
  )
}
