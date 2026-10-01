import { ChartCard } from '@/components/dashboard/ChartCard'
import { ReleaseEtaText } from '@/components/releases/ReleaseEtaText'
import { useReleaseForecast } from '@/hooks/queries/useReleases'
import { formatDate } from '@/lib/date'
import { toApiError } from '@/lib/error'

/** Module 9 gap-closure - dashboard gadget: projected completion for every unreleased release in
 * one project. */
export function ReleaseForecastCard({ projectId }: { projectId: string }) {
  const { data, isLoading, isError, error, refetch } = useReleaseForecast(projectId)

  return (
    <ChartCard
      title="Release Forecast"
      description="Projected completion of each unreleased release"
      isLoading={isLoading}
      isError={isError}
      errorMessage={isError ? toApiError(error).message : undefined}
      onRetry={() => void refetch()}
      isEmpty={!data || data.length === 0}
      emptyMessage="No unreleased releases in this project."
    >
      <ul className="h-full space-y-3 overflow-y-auto pr-1">
        {(data ?? []).map((row) => (
          <li key={row.releaseId} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium">{row.name}</span>
              <span className="text-xs text-muted-foreground">
                {row.releaseDate ? `Target ${formatDate(row.releaseDate)}` : 'No target date'}
              </span>
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label={`${row.name} progress`}
              aria-valuenow={row.progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${row.progress}%` }}
              />
            </div>
            <ReleaseEtaText eta={row.eta} />
          </li>
        ))}
      </ul>
    </ChartCard>
  )
}
