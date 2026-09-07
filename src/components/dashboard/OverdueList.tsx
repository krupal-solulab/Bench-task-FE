import { AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { TableSkeleton } from '@/components/common/Skeleton'
import { useOverdueSummary } from '@/hooks/queries/useDashboard'
import { formatDate } from '@/lib/date'
import { toApiError } from '@/lib/error'
import type { DashboardScopeQuery } from '@/types/dashboard.types'

export function OverdueList({ scope }: { scope: DashboardScopeQuery }) {
  const { data, isLoading, isError, error, refetch } = useOverdueSummary(scope)

  return (
    <div className="flex h-[340px] flex-col rounded-xl border bg-card p-4 shadow-soft transition-shadow duration-200 hover:shadow-card">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
        Overdue tasks
      </h3>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && <TableSkeleton rows={4} columns={3} />}
        {isError && (
          <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
        )}
        {!isLoading && !isError && data?.length === 0 && (
          <EmptyState title="Nothing overdue" description="All caught up." />
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
                    {item.project.name}
                    {item.assignee ? ` · ${item.assignee.name}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <PriorityBadge priority={item.priority} />
                  <span className="text-xs font-medium text-destructive">
                    {formatDate(item.dueDate)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
