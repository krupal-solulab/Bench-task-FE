import { StatCard } from '@/components/dashboard/StatCard'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { CardSkeleton } from '@/components/common/Skeleton'
import { useSprint, useSprintRetrospective } from '@/hooks/queries/useSprints'
import { toApiError } from '@/lib/error'

export interface SprintRetrospectiveProps {
  projectId: string
  sprintId: string | undefined
}

/** Module 9's sprint retrospective: planned vs. completed scope, mid-sprint scope changes, and
 * carryover, for the same sprint selected for the Burndown chart above it. */
export function SprintRetrospective({ projectId, sprintId }: SprintRetrospectiveProps) {
  const { data: sprint } = useSprint(projectId, sprintId)
  const { data, isLoading, isError, error, refetch } = useSprintRetrospective(projectId, sprintId)

  if (!sprintId) {
    return (
      <div className="rounded-xl border bg-card p-4 shadow-soft">
        <h3 className="mb-2 text-sm font-semibold">Sprint retrospective</h3>
        <EmptyState title="Select a sprint to view its retrospective." />
      </div>
    )
  }

  if (isLoading) return <CardSkeleton />
  if (isError) {
    return (
      <div className="rounded-xl border bg-card p-4 shadow-soft">
        <h3 className="mb-2 text-sm font-semibold">Sprint retrospective</h3>
        <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
      </div>
    )
  }
  if (!data || data.plannedCount + data.addedCount === 0) {
    return (
      <div className="rounded-xl border bg-card p-4 shadow-soft">
        <h3 className="mb-2 text-sm font-semibold">Sprint retrospective</h3>
        <EmptyState title="This sprint hasn't started yet." />
      </div>
    )
  }

  // A Completed sprint's "not yet Done" tasks were carried over by the end-of-sprint sweep; an
  // Active sprint's are just still in progress - same figure, different framing for the reader.
  const carryoverLabel = sprint?.status === 'Completed' ? 'Carried over' : 'Still remaining'

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Sprint retrospective</h3>
        {data.completionRatePercent != null && (
          <span className="text-sm font-medium text-muted-foreground">
            {data.completionRatePercent}% complete
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Planned" value={`${data.plannedCount} (${data.plannedPoints} pts)`} />
        <StatCard label="Added" value={`${data.addedCount} (${data.addedPoints} pts)`} />
        <StatCard
          label="Completed"
          value={`${data.completedCount} (${data.completedPoints} pts)`}
        />
        <StatCard
          label={carryoverLabel}
          value={`${data.carryoverCount} (${data.carryoverPoints} pts)`}
        />
        <StatCard label="Removed" value={`${data.removedCount} (${data.removedPoints} pts)`} />
      </div>
    </div>
  )
}
