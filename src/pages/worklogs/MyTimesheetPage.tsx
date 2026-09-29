import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DatePicker } from '@/components/common/DatePicker'
import { CardSkeleton } from '@/components/common/Skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useMyTimesheet } from '@/hooks/queries/useWorkLogs'
import { formatDate } from '@/lib/date'
import { toApiError } from '@/lib/error'
import type { TimesheetGroupBy } from '@/types/worklog.types'

const MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })

/** Module 3's personal cross-project timesheet (BRD gap-closure) - every hour the caller has
 * logged themselves, across every project, bucketed by week or month. Mirrors MyTasksPage's
 * "personal, not project-scoped" page pattern. */
export function MyTimesheetPage() {
  const [from, setFrom] = useState<string | null>(null)
  const [to, setTo] = useState<string | null>(null)
  const [groupBy, setGroupBy] = useState<TimesheetGroupBy>('week')

  const { data, isLoading, isError, error, refetch } = useMyTimesheet({
    from: from ?? undefined,
    to: to ?? undefined,
    groupBy,
  })

  function bucketLabel(bucketStart: string): string {
    return groupBy === 'week'
      ? `Week of ${formatDate(bucketStart)}`
      : MONTH_FORMATTER.format(new Date(bucketStart))
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My Timesheet" description="Your logged hours across every project" />

      <div className="flex flex-wrap items-center gap-2">
        <DatePicker label="From" value={from} onChange={setFrom} className="w-40" />
        <DatePicker label="To" value={to} onChange={setTo} className="w-40" />
        <Select value={groupBy} onValueChange={(v) => setGroupBy(v as TimesheetGroupBy)}>
          <SelectTrigger aria-label="Group by" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="month">Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <CardSkeleton />
      ) : isError ? (
        <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
      ) : !data || data.buckets.length === 0 ? (
        <EmptyState
          title="No work logged yet"
          description="Hours you log against a task will show up here, grouped by week or month."
        />
      ) : (
        <div className="space-y-3">
          {data.buckets.map((bucket) => (
            <div
              key={bucket.bucketStart}
              className="space-y-2 rounded-xl border bg-card p-4 shadow-soft"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium">{bucketLabel(bucket.bucketStart)}</h3>
                <p className="text-xs text-muted-foreground">
                  {bucket.totalHours}h logged ({bucket.billableHours}h billable)
                </p>
              </div>
              <ul className="divide-y">
                {bucket.entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {entry.issueKey && (
                          <span className="font-mono text-xs text-muted-foreground">
                            {entry.issueKey}{' '}
                          </span>
                        )}
                        {entry.taskTitle}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {entry.projectName} · {formatDate(entry.workDate)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {entry.hours}h{!entry.billable && ' (non-billable)'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
