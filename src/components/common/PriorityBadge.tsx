import { CHART_COLORS, PRIORITY_COLORS } from '@/lib/constants'
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
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
        PRIORITY_COLORS[priority],
        className,
      )}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: CHART_COLORS.priority[priority] }}
        aria-hidden="true"
      />
      {priority}
    </span>
  )
}
