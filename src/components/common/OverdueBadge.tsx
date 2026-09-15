import { AlertCircle } from 'lucide-react'
import { isOverdue } from '@/lib/date'
import { cn } from '@/lib/cn'

export function OverdueBadge({
  dueDate,
  status,
  isDone,
  className,
}: {
  dueDate: string | null | undefined
  status?: string
  isDone?: boolean
  className?: string
}) {
  if (!isOverdue(dueDate, status, isDone)) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-100 px-2 py-0.5',
        'text-xs font-medium text-red-700',
        className,
      )}
    >
      <AlertCircle className="h-3 w-3" aria-hidden="true" />
      Overdue
    </span>
  )
}
