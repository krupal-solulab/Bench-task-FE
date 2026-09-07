import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'
import { cn } from '@/lib/cn'

export interface FilterBarProps {
  children: ReactNode
  onClear?: () => void
  hasActiveFilters?: boolean
  className?: string
}

/** Layout shell for a row of filter controls (search, selects, date ranges) plus a clear action. */
export function FilterBar({ children, onClear, hasActiveFilters, className }: FilterBarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {children}
      {hasActiveFilters && onClear && (
        <Button variant="ghost" size="sm" onClick={onClear} className="gap-1">
          <X className="h-3.5 w-3.5" />
          Clear filters
        </Button>
      )}
    </div>
  )
}
