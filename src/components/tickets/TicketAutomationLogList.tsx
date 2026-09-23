import { useState } from 'react'
import { EmptyState } from '@/components/common/EmptyState'
import { Skeleton } from '@/components/common/Skeleton'
import { ErrorState } from '@/components/common/ErrorState'
import { Pagination } from '@/components/common/Pagination'
import { useTicketAutomationLog } from '@/hooks/queries/useTickets'
import { formatDateTime } from '@/lib/date'
import { toApiError } from '@/lib/error'
import { PAGE_SIZE_OPTIONS } from '@/lib/constants'

const TRIGGER_LABELS: Record<string, string> = {
  TicketCreated: 'Ticket Created',
  TicketStatusChanged: 'Status Changed',
  TicketCommentAdded: 'Comment Added',
  TicketReassigned: 'Reassigned',
  ScheduledAutomation: 'Scheduled Automation',
  Macro: 'Macro',
}

/** BRD 3.3's ticket automation audit trail viewer - "which rule/automation/macro fired, when, on
 * which ticket, and whether it succeeded" - mirrors AutomationLogList's exact shape. */
export function TicketAutomationLogList() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState<number>(PAGE_SIZE_OPTIONS[0])
  const { data, isLoading, isError, error, refetch } = useTicketAutomationLog(page, limit)

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
        description="Every trigger/automation/macro firing (success or failure) will be recorded here."
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
                {entry.ticket
                  ? `${entry.ticket.ticketKey} · ${entry.ticket.subject}`
                  : 'Ticket no longer exists'}
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
