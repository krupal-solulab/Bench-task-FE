import { Activity } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { TableSkeleton } from '@/components/common/Skeleton'
import { useActiveSprintsHealth } from '@/hooks/queries/useDashboard'
import { toApiError } from '@/lib/error'
import type { DashboardScopeQuery } from '@/types/dashboard.types'

/** "Burndown" reframed at dashboard scope (Search/Dashboards v2): every currently-Active sprint
 * across accessible projects, most behind schedule first - not an overlaid multi-sprint line
 * chart, since sprints have different date ranges and one shared axis wouldn't mean anything
 * across projects. Mirrors OverdueList's self-contained list-widget shape (own card chrome, not
 * ChartCard, since this isn't a chart). */
export function ActiveSprintsHealthList({ scope }: { scope: DashboardScopeQuery }) {
  const { data, isLoading, isError, error, refetch } = useActiveSprintsHealth(scope)

  return (
    <div className="flex h-[340px] flex-col rounded-xl border bg-card p-4 shadow-soft transition-shadow duration-200 hover:shadow-card">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
        Active sprints health
      </h3>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && <TableSkeleton rows={4} columns={2} />}
        {isError && (
          <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
        )}
        {!isLoading && !isError && data?.length === 0 && (
          <EmptyState title="No active sprints" description="Nothing currently in progress." />
        )}
        {!isLoading && !isError && data && data.length > 0 && (
          <ul className="divide-y">
            {data.map((sprint) => {
              const remaining = sprint.hasStoryPoints
                ? sprint.remainingPoints
                : sprint.remainingCount
              const behindSchedule = sprint.percentWorkRemaining > 100 - sprint.percentTimeElapsed
              return (
                <li
                  key={sprint.sprintId}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <Link
                      to={`/projects/${sprint.projectId}?tab=reports`}
                      className="truncate font-medium transition-colors hover:text-primary"
                    >
                      {sprint.sprintName}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">{sprint.projectName}</p>
                  </div>
                  <div className="shrink-0 text-right text-xs">
                    <span
                      className={
                        behindSchedule ? 'font-medium text-destructive' : 'text-muted-foreground'
                      }
                    >
                      {remaining} remaining
                    </span>
                    <p className="text-muted-foreground">
                      {sprint.percentTimeElapsed}% time elapsed
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
