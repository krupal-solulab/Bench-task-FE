import { useState } from 'react'
import { Library } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCustomFieldLibrary } from '@/hooks/queries/useCustomFieldLibrary'
import { useAdoptLibraryField } from '@/hooks/mutations/useProjectMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import type { Project } from '@/types/project.types'

export interface AddLibraryFieldControlProps {
  projectId: string
  project: Pick<Project, 'customFields'>
  canManage: boolean
}

/** Module 8 gap-closure - adopt an org-wide library field into this project. Renders nothing
 * for non-managers or when the library has nothing this project doesn't already have. */
export function AddLibraryFieldControl({
  projectId,
  project,
  canManage,
}: AddLibraryFieldControlProps) {
  const { data: library = [] } = useCustomFieldLibrary(canManage)
  const adopt = useAdoptLibraryField(projectId)
  const { showToast } = useToast()
  const [entryId, setEntryId] = useState<string>('')
  const [required, setRequired] = useState(false)

  const presentIds = new Set(project.customFields.map((f) => f.id))
  const available = library.filter((entry) => !presentIds.has(entry.id))
  if (!canManage || available.length === 0) return null

  async function handleAdd() {
    if (!entryId) return
    try {
      await adopt.mutateAsync({ entryId, required })
      showToast({ title: 'Library field added', variant: 'success' })
      setEntryId('')
      setRequired(false)
    } catch (err) {
      showToast({
        title: 'Could not add field',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-3">
      <Library className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <span className="text-sm">Add from the org field library</span>
      <Select value={entryId} onValueChange={setEntryId}>
        <SelectTrigger className="w-56" aria-label="Library field">
          <SelectValue placeholder="Choose a field…" />
        </SelectTrigger>
        <SelectContent>
          {available.map((entry) => (
            <SelectItem key={entry.id} value={entry.id}>
              {entry.name} ({entry.type})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={required}
          onCheckedChange={(c) => setRequired(c === true)}
          aria-label="Required in this project"
        />
        Required
      </label>
      <Button size="sm" onClick={handleAdd} disabled={!entryId} loading={adopt.isPending}>
        Add library field
      </Button>
    </div>
  )
}
