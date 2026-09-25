import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { formatAuditAction, formatAuditMetadata } from '@/lib/audit-log'
import { formatDateTime } from '@/lib/date'
import type { AuditLogEntry } from '@/types/audit-log.types'

export interface AuditLogTableProps {
  entries: AuditLogEntry[]
  isLoading: boolean
  isError: boolean
  errorMessage?: string
  onRetry: () => void
  hasActiveFilters?: boolean
  onClearFilters?: () => void
}

export function AuditLogTable({
  entries,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  hasActiveFilters,
  onClearFilters,
}: AuditLogTableProps) {
  const columns: DataTableColumn<AuditLogEntry>[] = [
    {
      key: 'createdAt',
      header: 'Time',
      render: (entry) => (
        <span className="whitespace-nowrap">{formatDateTime(entry.createdAt)}</span>
      ),
    },
    {
      key: 'actor',
      header: 'Actor',
      render: (entry) => <span title={entry.actor.email}>{entry.actor.name}</span>,
    },
    {
      key: 'action',
      header: 'Action',
      render: (entry) => (
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
          {formatAuditAction(entry.action)}
        </span>
      ),
    },
    {
      key: 'target',
      header: 'Target',
      render: (entry) => (
        <span>
          {entry.targetType}
          {entry.targetLabel && `: ${entry.targetLabel}`}
        </span>
      ),
    },
    {
      key: 'metadata',
      header: 'Details',
      render: (entry) => (
        <span className="text-xs text-muted-foreground">{formatAuditMetadata(entry.metadata)}</span>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={entries}
      getRowKey={(entry) => entry.id}
      isLoading={isLoading}
      isError={isError}
      errorMessage={errorMessage}
      onRetry={onRetry}
      emptyState={
        <EmptyState
          title={hasActiveFilters ? 'No results for these filters' : 'No audit log entries yet'}
          actionLabel={hasActiveFilters ? 'Clear filters' : undefined}
          onAction={hasActiveFilters ? onClearFilters : undefined}
        />
      }
    />
  )
}
