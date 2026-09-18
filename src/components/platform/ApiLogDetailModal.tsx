import { Modal } from '@/components/common/Modal'
import { ErrorState } from '@/components/common/ErrorState'
import { Skeleton } from '@/components/common/Skeleton'
import { useApiLogDetail } from '@/hooks/queries/useApiLogs'
import { formatDateTime } from '@/lib/date'
import { toApiError } from '@/lib/error'

export interface ApiLogDetailModalProps {
  logId: string | null
  onOpenChange: (open: boolean) => void
}

function JsonBlock({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <p className="text-sm text-muted-foreground">—</p>
  }
  return (
    <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

/** Row-click detail view for the API Logs table - the payload fields only exist here, never on
 * the list response, so this always fetches its own detail record. */
export function ApiLogDetailModal({ logId, onOpenChange }: ApiLogDetailModalProps) {
  const { data: log, isLoading, isError, error } = useApiLogDetail(logId ?? undefined)

  return (
    <Modal open={!!logId} onOpenChange={onOpenChange} title="API log entry" size="lg">
      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}
      {isError && <ErrorState message={toApiError(error).message} />}
      {log && (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Method</dt>
            <dd className="font-mono">{log.method}</dd>
            <dt className="text-muted-foreground">Path</dt>
            <dd className="font-mono">{log.path}</dd>
            <dt className="text-muted-foreground">Status</dt>
            <dd>{log.statusCode}</dd>
            <dt className="text-muted-foreground">Duration</dt>
            <dd>{log.durationMs} ms</dd>
            <dt className="text-muted-foreground">User</dt>
            <dd>{log.userEmail ?? '—'}</dd>
            <dt className="text-muted-foreground">Organization</dt>
            <dd>{log.organization?.name ?? '—'}</dd>
            <dt className="text-muted-foreground">Time</dt>
            <dd>{formatDateTime(log.createdAt)}</dd>
          </dl>

          <p className="text-xs text-muted-foreground">
            Sensitive fields (passwords, tokens, secrets) are redacted below before storage.
          </p>

          <div className="space-y-1">
            <p className="text-sm font-medium">Request body</p>
            <JsonBlock value={log.requestBody} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Response body</p>
            <JsonBlock value={log.responseBody} />
          </div>
        </div>
      )}
    </Modal>
  )
}
