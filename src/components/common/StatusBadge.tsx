import { CHART_COLORS, STATUS_COLORS } from '@/lib/constants'
import { cn } from '@/lib/cn'
import type { ProjectStatus } from '@/types/project.types'
import type { SprintStatus } from '@/types/sprint.types'
import type { TaskStatus } from '@/types/task.types'

const COLOR_MAP = {
  project: STATUS_COLORS.project,
  task: STATUS_COLORS.task,
  sprint: STATUS_COLORS.sprint,
}
const DOT_MAP = {
  project: CHART_COLORS.projectStatus,
  task: CHART_COLORS.taskStatus,
  sprint: CHART_COLORS.sprintStatus,
}

interface StatusBadgeProps {
  status: ProjectStatus | TaskStatus | SprintStatus
  kind: 'project' | 'task' | 'sprint'
  className?: string
}

export function StatusBadge({ status, kind, className }: StatusBadgeProps) {
  const colorClass = (COLOR_MAP[kind] as Record<string, string>)[status] ?? STATUS_COLORS.task.Todo
  const dotColor = (DOT_MAP[kind] as Record<string, string>)[status] ?? CHART_COLORS.single

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
