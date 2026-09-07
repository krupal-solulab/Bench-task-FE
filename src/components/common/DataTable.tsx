import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { ErrorState } from './ErrorState'
import { TableSkeleton } from './Skeleton'
import type { SortOrder } from '@/types/api.types'

export interface DataTableColumn<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  sortable?: boolean
  className?: string
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  getRowKey: (row: T) => string
  isLoading?: boolean
  isError?: boolean
  errorMessage?: string
  onRetry?: () => void
  emptyState?: ReactNode
  sortBy?: string
  sortOrder?: SortOrder
  onSortChange?: (sortBy: string, sortOrder: SortOrder) => void
  onRowClick?: (row: T) => void
}

/** Generic sortable table with built-in loading/error/empty slots — reused across every list screen. */
export function DataTable<T>({
  columns,
  data,
  getRowKey,
  isLoading = false,
  isError = false,
  errorMessage = 'Failed to load data.',
  onRetry,
  emptyState,
  sortBy,
  sortOrder = 'asc',
  onSortChange,
  onRowClick,
}: DataTableProps<T>) {
  if (isLoading) return <TableSkeleton columns={columns.length} />
  if (isError) return <ErrorState message={errorMessage} onRetry={onRetry} />
  if (data.length === 0) return <>{emptyState ?? <ErrorState message="No data available." />}</>

  function handleSort(column: DataTableColumn<T>) {
    if (!column.sortable || !onSortChange) return
    const nextOrder: SortOrder = sortBy === column.key && sortOrder === 'asc' ? 'desc' : 'asc'
    onSortChange(column.key, nextOrder)
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border bg-card shadow-soft">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground',
                  column.className,
                )}
              >
                {column.sortable ? (
                  <button
                    type="button"
                    onClick={() => handleSort(column)}
                    className="inline-flex items-center gap-1 normal-case tracking-normal transition-colors hover:text-foreground"
                  >
                    {column.header}
                    {sortBy === column.key ? (
                      sortOrder === 'asc' ? (
                        <ArrowUp className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                    )}
                  </button>
                ) : (
                  <span className="normal-case tracking-normal">{column.header}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((row) => (
            <tr
              key={getRowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'transition-colors duration-150',
                onRowClick && 'cursor-pointer hover:bg-accent/40',
              )}
            >
              {columns.map((column) => (
                <td key={column.key} className={cn('px-4 py-3', column.className)}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
