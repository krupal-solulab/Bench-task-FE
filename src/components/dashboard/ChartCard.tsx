import type { ReactNode } from 'react'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { ChartSkeleton } from '@/components/common/Skeleton'

export interface ChartCardProps {
  title: string
  description?: string
  isLoading: boolean
  isError: boolean
  errorMessage?: string
  onRetry?: () => void
  isEmpty?: boolean
  emptyMessage?: string
  actions?: ReactNode
  children: ReactNode
}

/** Standard wrapper for every dashboard chart: fixed height, own loading/error/empty states. */
export function ChartCard({
  title,
  description,
  isLoading,
  isError,
  errorMessage = 'Failed to load chart data.',
  onRetry,
  isEmpty,
  emptyMessage = 'No data for this period.',
  actions,
  children,
}: ChartCardProps) {
  return (
    <div className="flex h-[340px] flex-col rounded-xl border bg-card p-4 shadow-soft transition-shadow duration-200 hover:shadow-card">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      <div className="min-h-0 flex-1">
        {isLoading ? (
          <ChartSkeleton height={260} />
        ) : isError ? (
          <ErrorState message={errorMessage} onRetry={onRetry} />
        ) : isEmpty ? (
          <EmptyState title={emptyMessage} />
        ) : (
          children
        )}
      </div>
    </div>
  )
}
