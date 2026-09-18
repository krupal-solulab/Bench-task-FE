import { useState } from 'react'
import { Bookmark, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { FormField } from '@/components/common/FormField'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSavedFilters } from '@/hooks/queries/useSavedFilters'
import {
  useCreateSavedFilter,
  useDeleteSavedFilter,
} from '@/hooks/mutations/useSavedFilterMutations'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import { canDeleteSavedFilter, describeSharedBadge } from '@/lib/saved-filter-sharing'
import type { SavedFilterScope } from '@/types/saved-filter.types'

export interface SavedFiltersMenuProps {
  scope: SavedFilterScope
  projectId?: string
  /** The filter criteria currently applied in the view - what "Save current filters" persists. */
  currentQuery: Record<string, unknown>
  onApply: (query: Record<string, unknown>) => void
  /** Resolves another member's display name for a shared filter's "Shared by …" label - omit for
   * a scope that never shares (e.g. 'myTasks'). */
  memberNameById?: Record<string, string>
}

const NONE = '__none__'

/** A small dropdown for saving/reloading a named task-filter combination - embedded next to
 * TaskFilters rather than a dedicated page. A 'project'-scoped filter can optionally be shared
 * with the rest of the project (Search/Dashboards v2) - only the owner can delete it either way. */
export function SavedFiltersMenu({
  scope,
  projectId,
  currentQuery,
  onApply,
  memberNameById,
}: SavedFiltersMenuProps) {
  const [selectedId, setSelectedId] = useState(NONE)
  const [saveOpen, setSaveOpen] = useState(false)
  const [name, setName] = useState('')
  const [shared, setShared] = useState(false)

  const { user } = useAuth()
  const { data: savedFilters } = useSavedFilters({ scope, projectId })
  const createSavedFilter = useCreateSavedFilter()
  const deleteSavedFilter = useDeleteSavedFilter()
  const { showToast } = useToast()

  const selectedFilter = savedFilters?.find((f) => f.id === selectedId)
  const canDeleteSelected = selectedFilter && canDeleteSavedFilter(selectedFilter, user?.id)

  function handleApply(id: string) {
    setSelectedId(id)
    const filter = savedFilters?.find((f) => f.id === id)
    if (filter) onApply(filter.query)
  }

  async function handleDelete() {
    if (selectedId === NONE) return
    try {
      await deleteSavedFilter.mutateAsync(selectedId)
      setSelectedId(NONE)
      showToast({ title: 'Saved filter deleted', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not delete saved filter',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleSave() {
    try {
      await createSavedFilter.mutateAsync({
        name,
        scope,
        projectId,
        visibility: shared ? 'shared' : 'private',
        query: currentQuery,
      })
      setSaveOpen(false)
      setName('')
      setShared(false)
      showToast({ title: 'Filter saved', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not save filter',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {!!savedFilters?.length && (
        <>
          <Select value={selectedId} onValueChange={handleApply}>
            <SelectTrigger className="w-44" aria-label="Load a saved filter">
              <SelectValue placeholder="Saved filters…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Saved filters…</SelectItem>
              {savedFilters.map((f) => {
                const badge = describeSharedBadge(f, user?.id, memberNameById)
                return (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                    {badge && <span className="ml-1 text-xs text-muted-foreground">{badge}</span>}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          {selectedId !== NONE && canDeleteSelected && (
            <button
              type="button"
              onClick={() => void handleDelete()}
              aria-label="Delete selected saved filter"
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={() => setSaveOpen(true)}
      >
        <Bookmark className="h-4 w-4" /> Save current filters…
      </Button>

      <Modal open={saveOpen} onOpenChange={setSaveOpen} title="Save current filters">
        <div className="space-y-4">
          <FormField label="Name" htmlFor="saved-filter-name" required>
            <Input
              id="saved-filter-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My open P1 bugs"
            />
          </FormField>
          {scope === 'project' && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={shared}
                onCheckedChange={(checked) => setShared(checked === true)}
              />
              <Users className="h-4 w-4 text-muted-foreground" />
              Share with everyone on this project
            </label>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              loading={createSavedFilter.isPending}
              disabled={!name.trim()}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
