import { ListChecks } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { TableSkeleton } from '@/components/common/Skeleton'
import { useMyOpenIssues } from '@/hooks/queries/useDashboard'
import { formatDate } from '@/lib/date'
import { toApiError } from '@/lib/error'
import type { DashboardScopeQuery } from '@/types/dashboard.types'

/** BRD 7's "My Open Issues" widget - the caller's own not-yet-Done assigned tasks, mirrors
 * OverdueList.tsx's shape/layout exactly. */
export function MyOpenIssuesList({ scope }: { scope: DashboardScopeQuery }) {
  const { data, isLoading, isError, error, refetch } = useMyOpenIssues(scope)

  return (
    <div className="flex h-[340px] flex-col rounded-xl border bg-card p-4 shadow-soft transition-shadow duration-200 hover:shadow-card">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <ListChecks className="h-4 w-4 text-primary" aria-hidden="true" />
        My open issues
      </h3>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && <TableSkeleton rows={4} columns={3} />}
        {isError && (
          <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
        )}
        {!isLoading && !isError && data?.length === 0 && (
          <EmptyState title="Nothing assigned to you" description="You're all caught up." />
        )}
        {!isLoading && !isError && data && data.length > 0 && (
          <ul className="divide-y">
            {data.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <Link
                    to={`/tasks/${item.id}`}
                    className="truncate font-medium transition-colors hover:text-primary"
                  >
                    {item.title}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.project.name} · {item.issueKey}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={item.status} kind="task" />
                  <PriorityBadge priority={item.priority} />
                  {item.dueDate && (
                    <span className="text-xs text-muted-foreground">
                      {formatDate(item.dueDate)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
