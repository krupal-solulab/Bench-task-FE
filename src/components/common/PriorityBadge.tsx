import { PRIORITY_COLORS } from '@/lib/constants'
import { cn } from '@/lib/cn'
import type { TaskPriority } from '@/types/task.types'

export function PriorityBadge({
  priority,
  className,
}: {
  priority: TaskPriority
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        PRIORITY_COLORS[priority],
        className,
      )}
    >
      {priority}
    </span>
  )
}
