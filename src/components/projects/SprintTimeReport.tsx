import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { TableSkeleton } from '@/components/common/Skeleton'
import { useSprintWorkLogReport } from '@/hooks/queries/useWorkLogs'
import { toApiError } from '@/lib/error'

export interface SprintTimeReportProps {
  projectId: string
  sprintId: string | undefined
}

/** Module 3's sprint-level time-spent-vs-estimate report (BRD gap-closure: the "sprint" level of
 * the issue/sprint/project trio, previously missing) - shares the Reports tab's existing sprint
 * selector rather than adding a second one. */
export function SprintTimeReport({ projectId, sprintId }: SprintTimeReportProps) {
  const { data, isLoading, isError, error, refetch } = useSprintWorkLogReport(projectId, sprintId)

  if (!sprintId) return null

  return (
    <div className="space-y-2 rounded-xl border bg-card p-4 shadow-soft">
      <h3 className="text-sm font-semibold">Sprint time spent vs. estimate</h3>
      {isLoading && <TableSkeleton rows={3} columns={2} />}
      {isError && <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />}
      {!isLoading && !isError && data && data.tasks.length === 0 && (
        <EmptyState
          title="No tasks in this sprint"
          description="Add tasks to this sprint to see their time spent vs. estimate here."
        />
      )}
      {!isLoading && !isError && data && data.tasks.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground">
            {data.totalLoggedHours}h logged of {data.totalEstimateHours}h estimated
          </p>
          <ul className="divide-y">
            {data.tasks.map((task) => (
              <li
                key={task.taskId}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <Link
                    to={`/tasks/${task.taskId}`}
                    className="truncate font-medium transition-colors hover:text-primary"
                  >
                    {task.issueKey ?? task.title}
                  </Link>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {task.loggedHours}h / {task.originalEstimateHours ?? '—'}h
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
