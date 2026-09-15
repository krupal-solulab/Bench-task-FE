import { useState } from 'react'
import { Bookmark, Trash2 } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { FormField } from '@/components/common/FormField'
import { Input } from '@/components/ui/input'
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
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import type { SavedFilterScope } from '@/types/saved-filter.types'

export interface SavedFiltersMenuProps {
  scope: SavedFilterScope
  projectId?: string
  /** The filter criteria currently applied in the view - what "Save current filters" persists. */
  currentQuery: Record<string, unknown>
  onApply: (query: Record<string, unknown>) => void
}

const NONE = '__none__'

/** A small dropdown for saving/reloading a named task-filter combination - embedded next to
 * TaskFilters rather than a dedicated page, owner-only, no team sharing (see Phase 6 plan). */
export function SavedFiltersMenu({
  scope,
  projectId,
  currentQuery,
  onApply,
}: SavedFiltersMenuProps) {
  const [selectedId, setSelectedId] = useState(NONE)
  const [saveOpen, setSaveOpen] = useState(false)
  const [name, setName] = useState('')

  const { data: savedFilters } = useSavedFilters({ scope, projectId })
  const createSavedFilter = useCreateSavedFilter()
  const deleteSavedFilter = useDeleteSavedFilter()
  const { showToast } = useToast()

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
      await createSavedFilter.mutateAsync({ name, scope, projectId, query: currentQuery })
      setSaveOpen(false)
      setName('')
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
              {savedFilters.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedId !== NONE && (
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
