import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { cn } from '@/lib/cn'
import { formatDateTime } from '@/lib/date'
import type { ApiLogEntry } from '@/types/api-log.types'

export interface ApiLogTableProps {
  logs: ApiLogEntry[]
  isLoading: boolean
  isError: boolean
  errorMessage?: string
  onRetry: () => void
  hasActiveFilters?: boolean
  onClearFilters?: () => void
}

function statusBadgeClass(statusCode: number): string {
  if (statusCode >= 500) return 'bg-red-100 text-red-700 border-red-200'
  if (statusCode >= 400) return 'bg-amber-100 text-amber-700 border-amber-200'
  if (statusCode >= 300) return 'bg-blue-100 text-blue-700 border-blue-200'
  return 'bg-emerald-100 text-emerald-700 border-emerald-200'
}

function StatusCodeBadge({ statusCode }: { statusCode: number }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        statusBadgeClass(statusCode),
      )}
    >
      {statusCode}
    </span>
  )
}

const METHOD_CLASSES: Record<string, string> = {
  GET: 'text-blue-700',
  POST: 'text-emerald-700',
  PATCH: 'text-amber-700',
  PUT: 'text-amber-700',
  DELETE: 'text-red-700',
}

export function ApiLogTable({
  logs,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  hasActiveFilters,
  onClearFilters,
}: ApiLogTableProps) {
  const columns: DataTableColumn<ApiLogEntry>[] = [
    {
      key: 'createdAt',
      header: 'Time',
      render: (log) => <span className="whitespace-nowrap">{formatDateTime(log.createdAt)}</span>,
    },
    {
      key: 'method',
      header: 'Method',
      render: (log) => (
        <span className={cn('font-mono text-xs font-semibold', METHOD_CLASSES[log.method])}>
          {log.method}
        </span>
      ),
    },
    {
      key: 'path',
      header: 'Path',
      render: (log) => (
        <span className="font-mono text-xs" title={log.path}>
          {log.path}
        </span>
      ),
    },
    {
      key: 'statusCode',
      header: 'Status',
      render: (log) => <StatusCodeBadge statusCode={log.statusCode} />,
    },
    {
      key: 'organization',
      header: 'Organization',
      render: (log) => log.organization?.name ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'user',
      header: 'User',
      render: (log) => log.userEmail ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'durationMs',
      header: 'Duration',
      render: (log) => `${log.durationMs} ms`,
    },
    {
      key: 'errorMessage',
      header: 'Error',
      render: (log) =>
        log.errorMessage ? (
          <span className="text-destructive" title={log.errorMessage}>
            {log.errorMessage}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={logs}
      getRowKey={(log) => log.id}
      isLoading={isLoading}
      isError={isError}
      errorMessage={errorMessage}
      onRetry={onRetry}
      emptyState={
        <EmptyState
          title={hasActiveFilters ? 'No results for these filters' : 'No API activity yet'}
          actionLabel={hasActiveFilters ? 'Clear filters' : undefined}
          onAction={hasActiveFilters ? onClearFilters : undefined}
        />
      }
    />
  )
}
