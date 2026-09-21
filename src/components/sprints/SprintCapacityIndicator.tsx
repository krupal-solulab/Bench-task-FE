import { useProjectTasks } from '@/hooks/queries/useProjects'
import { cn } from '@/lib/cn'
import type { Sprint } from '@/types/sprint.types'

export interface SprintCapacityIndicatorProps {
  projectId: string
  sprint: Sprint
}

/** BRD 6.3's "capacity indicator shows total story points/estimate planned vs. team capacity" -
 * a small component (not inline in a list) so it can call its own query per sprint without
 * breaking the rules of hooks (a `.map()` callback can't call hooks directly). Renders nothing
 * for a sprint with no capacityPoints set - the indicator is opt-in, not a default. */
export function SprintCapacityIndicator({ projectId, sprint }: SprintCapacityIndicatorProps) {
  const { data } = useProjectTasks(projectId, { page: 1, limit: 100, sprintId: sprint.id })

  if (!sprint.capacityPoints) return null

  const plannedPoints = (data?.data ?? []).reduce((sum, t) => sum + (t.storyPoints ?? 0), 0)
  const overCapacity = plannedPoints > sprint.capacityPoints

  return (
    <p
      className={cn(
        'text-xs',
        overCapacity ? 'font-medium text-destructive' : 'text-muted-foreground',
      )}
    >
      Capacity: {plannedPoints} / {sprint.capacityPoints} points planned
      {overCapacity && ' — over capacity'}
    </p>
  )
}
