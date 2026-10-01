import { formatDate } from '@/lib/date'
import { cn } from '@/lib/cn'
import type { ReleaseEta } from '@/types/release.types'

/** Module 9 gap-closure - a release's projected completion, in one line. Labeled as a projection
 * (it's a simple linear forecast from recent throughput, not a commitment). */
export function ReleaseEtaText({
  eta,
  className,
}: {
  eta: ReleaseEta | undefined
  className?: string
}) {
  if (!eta) return null

  if (eta.remainingIssues === 0) {
    return (
      <p className={cn('text-xs text-muted-foreground', className)}>
        {eta.projectedDate ? 'All issues done' : 'No issues in this release yet'}
      </p>
    )
  }
  if (!eta.projectedDate) {
    return (
      <p className={cn('text-xs text-muted-foreground', className)}>
        ETA: not enough recent completions to project
      </p>
    )
  }

  const rate = `${eta.throughputPerWeek}/week${eta.basis === 'project' ? ' project-wide' : ''}`
  return (
    <p className={cn('flex flex-wrap items-center gap-1.5 text-xs', className)}>
      <span className="text-muted-foreground">
        Projected: {formatDate(eta.projectedDate)} ({eta.remainingIssues} left at {rate})
      </span>
      {eta.onTrack === true && (
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-700 dark:text-emerald-400">
          On track
        </span>
      )}
      {eta.onTrack === false && (
        <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive">
          {eta.daysLate} day{eta.daysLate === 1 ? '' : 's'} late
        </span>
      )}
    </p>
  )
}
