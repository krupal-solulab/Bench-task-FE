import { History } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Checkbox } from '@/components/ui/checkbox'
import { useActivityFeed } from '@/hooks/queries/useTasks'
import { useQueryParams } from '@/hooks/useQueryParams'
import { describeActivity } from '@/lib/activity-labels'
import { formatRelativeTime } from '@/lib/date'
import { toApiError } from '@/lib/error'

/** Module 11 gap-closure - the activity feed: what's been happening across every issue you can
 * see, newest first, optionally only on issues you created, are assigned to, or watch. */
export function ActivityPage() {
  const [state, setState] = useQueryParams({ involved: false as boolean })
  const scope = state.involved ? 'involved' : 'all'
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useActivityFeed(scope)
  const entries = data?.pages.flatMap((page) => page.entries) ?? []

  return (
    <div className="space-y-6">
      <PageHeader title="Activity" description="Recent changes across the issues you can see" />

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={state.involved}
          onCheckedChange={(c) => setState({ involved: c === true })}
          aria-label="Only issues I'm involved in"
        />
        Only issues I'm involved in (created, assigned or watching)
      </label>

      {isError && <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />}
      {!isLoading && !isError && entries.length === 0 && (
        <EmptyState icon={History} title="No activity yet" />
      )}

      <ol className="space-y-2">
        {entries.map((entry) => (
          <li key={entry.id} className="rounded-lg border bg-card p-3 text-sm shadow-soft">
            <span className="font-medium">{entry.actor?.name ?? 'Someone'}</span>{' '}
            {describeActivity(entry)}{' '}
            <Link
              to={`/tasks/${entry.task.id}`}
              className="font-medium text-primary hover:underline"
            >
              {entry.task.issueKey ? `${entry.task.issueKey} ` : ''}
              {entry.task.title}
            </Link>
            <span className="ml-2 text-xs text-muted-foreground">
              {formatRelativeTime(entry.createdAt)}
            </span>
          </li>
        ))}
      </ol>

      {hasNextPage && (
        <Button variant="outline" onClick={() => void fetchNextPage()} loading={isFetchingNextPage}>
          Load more
        </Button>
      )}
    </div>
  )
}
