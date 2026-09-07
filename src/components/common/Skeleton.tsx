import { cn } from '@/lib/cn'

export function Skeleton({
  className,
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div className={cn('relative overflow-hidden rounded-md bg-muted', className)} style={style}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/10" />
    </div>
  )
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2" data-testid="table-skeleton">
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border p-4" data-testid="card-skeleton">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  )
}

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return <Skeleton className="w-full" style={{ height }} data-testid="chart-skeleton" />
}
