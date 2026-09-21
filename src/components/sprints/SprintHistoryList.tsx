import { EmptyState } from '@/components/common/EmptyState'
import { Skeleton } from '@/components/common/Skeleton'
import { ErrorState } from '@/components/common/ErrorState'
import { useSprintHistory } from '@/hooks/queries/useSprints'
import { formatDate } from '@/lib/date'
import { toApiError } from '@/lib/error'

export interface SprintHistoryListProps {
  projectId: string
}

/** BRD 6.3's Sprint History: "list of all past sprints per project with their date range, goal,
 * and completion rate." */
export function SprintHistoryList({ projectId }: SprintHistoryListProps) {
  const { data, isLoading, isError, error, refetch } = useSprintHistory(projectId)

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }
  if (isError) {
    return <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
  }
  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No sprint history yet"
        description="Completed sprints will appear here with their completion rate."
      />
    )
  }

  return (
    <div className="space-y-2">
      {data.map((sprint) => (
        <div
          key={sprint.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-4 py-3 text-sm"
        >
          <div>
            <p className="font-medium">{sprint.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}
              {sprint.goal && ` · ${sprint.goal}`}
            </p>
          </div>
          <span className="text-sm font-medium">{sprint.completionRatePercent ?? 0}% complete</span>
        </div>
      ))}
    </div>
  )
}
