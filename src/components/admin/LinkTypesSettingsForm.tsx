import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { CardSkeleton } from '@/components/common/Skeleton'
import { useLinkTypes } from '@/hooks/queries/useIssueLinks'
import { useUpdateLinkTypes } from '@/hooks/mutations/useIssueLinkMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import type { LinkTypeDraft } from '@/types/issue-link.types'

/** Module 1's org-wide issue-link type editor - mirrors FieldsSettingsForm's row-per-item shape
 * for a user-managed list. `isBlocking` controls whether a type participates in the dependency
 * graph's circular-dependency check (BRD: "Blocks" and its like should be protected against
 * cycles; "Relates To" and its like shouldn't). */
export function LinkTypesSettingsForm() {
  const { data: linkTypes, isLoading } = useLinkTypes()
  const [types, setTypes] = useState<LinkTypeDraft[]>([])
  const updateLinkTypes = useUpdateLinkTypes()
  const { showToast } = useToast()

  useEffect(() => {
    if (linkTypes) setTypes(linkTypes)
  }, [linkTypes])

  if (isLoading) return <CardSkeleton />

  const validNames = types.map((t) => t.name.trim()).filter(Boolean)
  const hasDuplicates = new Set(validNames).size !== validNames.length
  const canSave =
    types.length > 0 &&
    types.every((t) => t.name.trim().length > 0 && t.inverseName.trim().length > 0) &&
    !hasDuplicates

  function updateType(index: number, patch: Partial<LinkTypeDraft>) {
    setTypes(types.map((t, i) => (i === index ? { ...t, ...patch } : t)))
  }

  function addType() {
    setTypes([...types, { name: '', inverseName: '', isBlocking: false }])
  }

  function removeType(index: number) {
    setTypes(types.filter((_, i) => i !== index))
  }

  async function handleSave() {
    try {
      const saved = await updateLinkTypes.mutateAsync(types)
      setTypes(saved)
      showToast({ title: 'Link types updated', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not update link types',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Issue link types</h3>
          <p className="text-sm text-muted-foreground">
            "Blocking" types are protected against circular dependencies on the graph.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={addType} className="gap-1">
          <Plus className="h-4 w-4" /> Add link type
        </Button>
      </div>

      <div className="space-y-3">
        {types.map((type, index) => (
          <div key={type.id ?? index} className="flex items-center gap-2 rounded-md border p-3">
            <Input
              aria-label={`Link type ${index + 1} name`}
              value={type.name}
              onChange={(e) => updateType(index, { name: e.target.value })}
              placeholder="Blocks"
              className="w-40"
            />
            <Input
              aria-label={`Link type ${index + 1} inverse name`}
              value={type.inverseName}
              onChange={(e) => updateType(index, { inverseName: e.target.value })}
              placeholder="Is Blocked By"
              className="w-40"
            />
            <label className="flex items-center gap-1.5 text-sm">
              <Checkbox
                aria-label={`Link type ${index + 1} is blocking`}
                checked={type.isBlocking}
                onCheckedChange={(checked) => updateType(index, { isBlocking: checked === true })}
              />
              Blocking
            </label>
            <button
              type="button"
              onClick={() => removeType(index)}
              aria-label={`Remove link type ${type.name || index + 1}`}
              className="ml-auto text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {hasDuplicates && <p className="text-sm text-destructive">Link type names must be unique.</p>}

      <div className="flex justify-end border-t pt-4">
        <Button
          type="button"
          onClick={() => void handleSave()}
          loading={updateLinkTypes.isPending}
          disabled={!canSave}
        >
          Save link types
        </Button>
      </div>
    </div>
  )
}
