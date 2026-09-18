import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Textarea } from '@/components/ui/textarea'

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (draft.trim()) onSearch(draft.trim())
  }

  function handleClear() {
    setDraft('')
    onClear()
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
