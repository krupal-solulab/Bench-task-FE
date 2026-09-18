import { RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { ErrorState } from '@/components/common/ErrorState'
import { Skeleton } from '@/components/common/Skeleton'
import { useIntegrationHealth } from '@/hooks/queries/useIntegrationHealth'
import { toApiError } from '@/lib/error'
import { cn } from '@/lib/cn'
import type { IntegrationHealthStatus } from '@/types/integration-health.types'

const STATUS_CLASSES: Record<IntegrationHealthStatus, string> = {
  ok: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  error: 'bg-red-100 text-red-700 border-red-200',
  stub: 'bg-slate-100 text-slate-700 border-slate-200',
}

const STATUS_LABELS: Record<IntegrationHealthStatus, string> = {
  ok: 'Healthy',
  error: 'Unhealthy',
  stub: 'Not configured',
}

export function PlatformIntegrationHealthPage() {
  const { data, isLoading, isFetching, isError, error, refetch } = useIntegrationHealth()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integration Health"
        description="Live status of the services this platform depends on"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            loading={isFetching && !isLoading}
            className="gap-1"
          >
            <RefreshCw className="h-4 w-4" /> Recheck
          </Button>
        }
      />

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {isError && <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />}

      {data && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.map((entry) => (
            <div key={entry.name} className="space-y-2 rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{entry.name}</p>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                    STATUS_CLASSES[entry.status],
                  )}
                >
                  {STATUS_LABELS[entry.status]}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{entry.detail}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
