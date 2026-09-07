import { CHART_COLORS, STATUS_COLORS } from '@/lib/constants'
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
  const dotMap = kind === 'project' ? CHART_COLORS.projectStatus : CHART_COLORS.taskStatus
  const colorClass = (colorMap as Record<string, string>)[status] ?? STATUS_COLORS.task.Todo
  const dotColor = (dotMap as Record<string, string>)[status] ?? CHART_COLORS.single

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
        colorClass,
        className,
      )}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: dotColor }}
        aria-hidden="true"
      />
      {status}
    </span>
  )
}
