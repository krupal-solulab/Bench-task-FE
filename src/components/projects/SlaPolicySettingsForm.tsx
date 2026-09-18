import { useEffect, useState } from 'react'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/ui/input'
import { CardSkeleton } from '@/components/common/Skeleton'
import { useSlaPolicy } from '@/hooks/queries/useProjects'
import { useUpdateSlaPolicy } from '@/hooks/mutations/useProjectMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import { TASK_PRIORITIES } from '@/types/task.types'
import type { SlaPolicyEntry } from '@/types/project.types'

export interface SlaPolicySettingsFormProps {
  projectId: string
  canManage: boolean
}

/** Resolution-time targets per priority (Search/Dashboards v2) - mirrors FieldsSettingsForm's
 * row-per-item shape, but for a fixed 3-row set (one per TASK_PRIORITIES entry) rather than a
 * user-managed list. Saving an empty entries array resets the project to the system default. */
export function SlaPolicySettingsForm({ projectId, canManage }: SlaPolicySettingsFormProps) {
  const { data: policy, isLoading } = useSlaPolicy(projectId)
  const updateSlaPolicy = useUpdateSlaPolicy(projectId)
  const { showToast } = useToast()

  const [hoursByPriority, setHoursByPriority] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!policy) return
    setHoursByPriority(Object.fromEntries(policy.map((p) => [p.priority, p.resolutionHours])))
  }, [policy])

  if (isLoading) return <CardSkeleton />

  const canSave = canManage && TASK_PRIORITIES.every((p) => (hoursByPriority[p] ?? 0) > 0)

  async function handleSave() {
    try {
      const entries: SlaPolicyEntry[] = TASK_PRIORITIES.map((priority) => ({
        priority,
        resolutionHours: hoursByPriority[priority] ?? 24,
      }))
      const saved = await updateSlaPolicy.mutateAsync(entries)
      setHoursByPriority(Object.fromEntries(saved.map((p) => [p.priority, p.resolutionHours])))
      showToast({ title: 'SLA policy updated', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not update SLA policy',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleReset() {
    try {
      const saved = await updateSlaPolicy.mutateAsync([])
      setHoursByPriority(Object.fromEntries(saved.map((p) => [p.priority, p.resolutionHours])))
      showToast({ title: 'SLA policy reset to the default', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not reset SLA policy',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  if (!canManage) {
    return (
      <div className="space-y-2">
        <h3 className="font-medium">SLA policy</h3>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {TASK_PRIORITIES.map((p) => (
            <li key={p}>
              {p}: {hoursByPriority[p] ?? '—'} hours to resolve
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium">SLA policy</h3>
      <p className="text-sm text-muted-foreground">
        How many hours a task of each priority has to be resolved before it's considered breached.
      </p>
      <div className="space-y-2">
        {TASK_PRIORITIES.map((priority) => (
          <div key={priority} className="flex items-center gap-2">
            <span className="w-10 text-sm font-medium">{priority}</span>
            <Input
              aria-label={`${priority} resolution hours`}
              type="number"
              min={1}
              max={24 * 365}
              className="w-28"
              value={hoursByPriority[priority] ?? ''}
              onChange={(e) =>
                setHoursByPriority({ ...hoursByPriority, [priority]: Number(e.target.value) })
              }
            />
            <span className="text-sm text-muted-foreground">hours</span>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleReset()}
          loading={updateSlaPolicy.isPending}
        >
          Reset to default
        </Button>
        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={!canSave}
          loading={updateSlaPolicy.isPending}
        >
          Save SLA policy
        </Button>
      </div>
    </div>
  )
}
