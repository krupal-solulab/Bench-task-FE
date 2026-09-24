import { useState } from 'react'
import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { DatePicker } from '@/components/common/DatePicker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProject } from '@/hooks/queries/useProjects'
import { useProjectWorkLogs, useWorkLogReport } from '@/hooks/queries/useWorkLogs'
import { formatDate } from '@/lib/date'
import type { WorkLogReportEntry, WorkLogWithTask } from '@/types/worklog.types'

const ALL_MEMBERS = '__all__'
const ALL_BILLABLE = '__all__'

/** A project's owner can also appear in its Developer-only members list (e.g. a Manager added
 * as a member on a project they also own) - dedupe by id so the filter dropdown never lists the
 * same person twice. */
function dedupeById<T extends { id: string }>(items: T[]): T[] {
  return [...new Map(items.map((item) => [item.id, item])).values()]
}

export interface TimesheetPanelProps {
  projectId: string
}

/** Module 3's project-wide Timesheet tab (BRD: "timesheets") - a per-user aggregated report plus
 * the raw, filterable log list underneath, both scoped by an optional date range. */
export function TimesheetPanel({ projectId }: TimesheetPanelProps) {
  const [from, setFrom] = useState<string | null>(null)
  const [to, setTo] = useState<string | null>(null)
  const [userId, setUserId] = useState(ALL_MEMBERS)
  const [billable, setBillable] = useState(ALL_BILLABLE)

  const { data: project } = useProject(projectId)
  const { data: report, isLoading: reportLoading } = useWorkLogReport(projectId, {
    from: from ?? undefined,
    to: to ?? undefined,
  })
  const { data: logs, isLoading: logsLoading } = useProjectWorkLogs(projectId, {
    page: 1,
    limit: 100,
    sortOrder: 'desc',
    from: from ?? undefined,
    to: to ?? undefined,
    userId: userId === ALL_MEMBERS ? undefined : userId,
    billable: billable === ALL_BILLABLE ? undefined : billable === 'true',
  })

  const reportColumns: DataTableColumn<WorkLogReportEntry>[] = [
    { key: 'userName', header: 'User', render: (r) => r.userName },
    { key: 'totalHours', header: 'Total hours', render: (r) => `${r.totalHours}h` },
    { key: 'billableHours', header: 'Billable', render: (r) => `${r.billableHours}h` },
    { key: 'nonBillableHours', header: 'Non-billable', render: (r) => `${r.nonBillableHours}h` },
    { key: 'entryCount', header: 'Entries', render: (r) => r.entryCount },
  ]

  const logColumns: DataTableColumn<WorkLogWithTask>[] = [
    { key: 'workDate', header: 'Date', render: (l) => formatDate(l.workDate) },
    { key: 'user', header: 'User', render: (l) => l.user.name },
    {
      key: 'task',
      header: 'Issue',
      render: (l) => l.task.issueKey ?? l.task.title,
    },
    { key: 'hours', header: 'Hours', render: (l) => `${l.hours}h` },
    { key: 'billable', header: 'Billable', render: (l) => (l.billable ? 'Yes' : 'No') },
    { key: 'description', header: 'Notes', render: (l) => l.description || '—' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <DatePicker label="From" value={from} onChange={setFrom} className="w-40" />
        <DatePicker label="To" value={to} onChange={setTo} className="w-40" />
        <Select value={userId} onValueChange={setUserId}>
          <SelectTrigger aria-label="Filter by user" className="w-44">
            <SelectValue placeholder="All members" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_MEMBERS}>All members</SelectItem>
            {dedupeById(
              [project?.owner, ...(project?.members.map((m) => m.user) ?? [])].filter(
                (u): u is NonNullable<typeof u> => !!u,
              ),
            ).map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={billable} onValueChange={setBillable}>
          <SelectTrigger aria-label="Filter by billable" className="w-40">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_BILLABLE}>All</SelectItem>
            <SelectItem value="true">Billable only</SelectItem>
            <SelectItem value="false">Non-billable only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Totals by user</h3>
        <DataTable
          columns={reportColumns}
          data={report?.entries ?? []}
          getRowKey={(r) => r.userId}
          isLoading={reportLoading}
          emptyState={<p className="p-4 text-sm text-muted-foreground">No work logged yet.</p>}
        />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Work log entries</h3>
        <DataTable
          columns={logColumns}
          data={logs?.data ?? []}
          getRowKey={(l) => l.id}
          isLoading={logsLoading}
          emptyState={<p className="p-4 text-sm text-muted-foreground">No work logged yet.</p>}
        />
      </div>
    </div>
  )
}
