import { STATUS_COLORS } from '@/lib/constants'
import { cn } from '@/lib/cn'
import type { ProjectStatus } from '@/types/project.types'
import type { TaskStatus } from '@/types/task.types'

interface StatusBadgeProps {
  status: ProjectStatus | TaskStatus
  kind: 'project' | 'task'
  className?: string
}

export function StatusBadge({ status, kind, className }: StatusBadgeProps) {
  const colorMap = kind === 'project' ? STATUS_COLORS.project : STATUS_COLORS.task
  const colorClass = (colorMap as Record<string, string>)[status] ?? STATUS_COLORS.task.Todo

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        colorClass,
        className,
      )}
    >
      {status}
    </span>
  )
}
