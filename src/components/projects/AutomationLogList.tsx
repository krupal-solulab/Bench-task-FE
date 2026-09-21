import { useState } from 'react'
import { EmptyState } from '@/components/common/EmptyState'
import { Skeleton } from '@/components/common/Skeleton'
import { ErrorState } from '@/components/common/ErrorState'
import { Pagination } from '@/components/common/Pagination'
import { useAutomationLog } from '@/hooks/queries/useProjects'
import { formatDateTime } from '@/lib/date'
import { toApiError } from '@/lib/error'
import { PAGE_SIZE_OPTIONS } from '@/lib/constants'

export interface AutomationLogListProps {
  projectId: string
}

const TRIGGER_LABELS: Record<string, string> = {
  IssueCreated: 'Issue Created',
  StatusChanged: 'Status Changed',
  UnassignedForDuration: 'Unassigned For Duration',
  AllSubtasksDone: 'All Sub-tasks Done',
}

/** BRD 8's automation audit trail viewer - "which rule fired, when, on which issue, and whether
 * it succeeded" - closes the "no queryable automation log" gap (automation actions are now queued
 * jobs, so their effects no longer land synchronously in the response that triggered them). */
export function AutomationLogList({ projectId }: AutomationLogListProps) {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState<number>(PAGE_SIZE_OPTIONS[0])
  const { data, isLoading, isError, error, refetch } = useAutomationLog(projectId, page, limit)

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
  if (!data || data.data.length === 0) {
    return (
      <EmptyState
        title="No automation activity yet"
        description="Every rule firing (success or failure) will be recorded here."
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {data.data.map((entry) => (
          <div
            key={entry.id}
            className="flex flex-wrap items-start justify-between gap-2 rounded-lg border bg-card px-4 py-3 text-sm"
          >
            <div>
              <p className="font-medium">
                {entry.ruleName}{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  ({TRIGGER_LABELS[entry.triggerType] ?? entry.triggerType})
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {entry.task
                  ? `${entry.task.issueKey} · ${entry.task.title}`
                  : 'Task no longer exists'}
              </p>
              <p className="text-xs text-muted-foreground">{entry.actionSummaries.join(', ')}</p>
              {entry.outcome === 'failure' && entry.errorMessage && (
                <p className="text-xs text-destructive">{entry.errorMessage}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <span
                className={
                  entry.outcome === 'success'
                    ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive'
                }
              >
                {entry.outcome === 'success' ? 'Success' : 'Failed'}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDateTime(entry.createdAt)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <Pagination
        page={page}
        limit={limit}
        total={data.meta.total}
        totalPages={data.meta.totalPages}
        onPageChange={setPage}
        onLimitChange={(newLimit) => {
          setLimit(newLimit)
          setPage(1)
        }}
      />
    </div>
  )
}
