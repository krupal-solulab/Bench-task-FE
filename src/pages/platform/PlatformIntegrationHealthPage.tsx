import { RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { ErrorState } from '@/components/common/ErrorState'
import { Skeleton } from '@/components/common/Skeleton'
import { useIntegrationHealth } from '@/hooks/queries/useIntegrationHealth'
import {
  usePauseIntegrationChannel,
  useResumeIntegrationChannel,
} from '@/hooks/mutations/useIntegrationHealthMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import { cn } from '@/lib/cn'
import { PAUSABLE_NOTIFICATION_CHANNELS } from '@/types/integration-health.types'
import type {
  IntegrationHealthStatus,
  PausableNotificationChannel,
} from '@/types/integration-health.types'

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

function isPausable(name: string): name is PausableNotificationChannel {
  return (PAUSABLE_NOTIFICATION_CHANNELS as readonly string[]).includes(name)
}

/** Separated from the row-mapping loop so `channel` is a real (narrowed) binding, not a re-read
 * of `entry.name` inside a closure - TS can't retain a type-predicate's narrowing on a property
 * access across a nested callback. */
function PauseResumeButton({
  channel,
  paused,
}: {
  channel: PausableNotificationChannel
  paused: boolean
}) {
  const pauseChannel = usePauseIntegrationChannel()
  const resumeChannel = useResumeIntegrationChannel()
  const { showToast } = useToast()

  async function handleClick() {
    try {
      if (paused) {
        await resumeChannel.mutateAsync(channel)
        showToast({ title: `${channel} resumed`, variant: 'success' })
      } else {
        await pauseChannel.mutateAsync(channel)
        showToast({ title: `${channel} paused`, variant: 'success' })
      }
    } catch (err) {
      showToast({
        title: `Could not update ${channel}`,
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="w-full"
      loading={pauseChannel.isPending || resumeChannel.isPending}
      onClick={() => void handleClick()}
    >
      {paused ? 'Resume' : 'Pause'}
    </Button>
  )
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
              {isPausable(entry.name) && (
                <PauseResumeButton channel={entry.name} paused={entry.paused === true} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
