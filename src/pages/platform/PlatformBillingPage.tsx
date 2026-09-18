import { PageHeader } from '@/components/layout/PageHeader'
import { ErrorState } from '@/components/common/ErrorState'
import { Skeleton } from '@/components/common/Skeleton'
import { usePlatformStats } from '@/hooks/queries/useOrganizations'
import { toApiError } from '@/lib/error'

const ESTIMATED_PRICE_PER_SEAT_USD = 12

export function PlatformBillingPage() {
  const { data, isLoading, isError, error, refetch } = usePlatformStats()

  const estimatedMrr = data ? data.totalUserCount * ESTIMATED_PRICE_PER_SEAT_USD : 0

  return (
    <div className="space-y-6">
      <PageHeader title="Billing Overview" description="Platform-wide usage and revenue snapshot" />

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {isError && <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />}

      {data && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1 rounded-lg border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Organizations</p>
            <p className="text-2xl font-semibold">{data.organizationCount}</p>
          </div>
          <div className="space-y-1 rounded-lg border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Total seats</p>
            <p className="text-2xl font-semibold">{data.totalUserCount}</p>
          </div>
          <div className="space-y-1 rounded-lg border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Estimated MRR</p>
            <p className="text-2xl font-semibold">${estimatedMrr.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">
              Estimated, for illustration only - at ${ESTIMATED_PRICE_PER_SEAT_USD}/seat. No billing
              provider is connected yet.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
