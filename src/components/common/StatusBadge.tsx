import { CHART_COLORS, STATUS_COLORS } from '@/lib/constants'
import { cn } from '@/lib/cn'
import type { StatusCategory } from '@/types/workflow.types'

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

// Fallback coloring for a task status name a custom workflow introduced (not one of the 4 fixed
// keys in STATUS_COLORS.task/CHART_COLORS.taskStatus) - keeps a sensible, category-consistent
// color instead of always falling back to the Todo color.
const CATEGORY_COLOR_CLASS: Record<StatusCategory, string> = {
  'To Do': 'bg-slate-100 text-slate-700 border-slate-200',
  'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
  Done: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}
const CATEGORY_DOT_COLOR: Record<StatusCategory, string> = {
  'To Do': '#64748b',
  'In Progress': '#3b82f6',
  Done: '#10b981',
}

interface StatusBadgeProps {
  status: string
  kind: 'project' | 'task' | 'sprint'
  /** Only consulted for a status name not already in the fixed color maps above. */
  category?: StatusCategory
  className?: string
}

export function StatusBadge({ status, kind, category, className }: StatusBadgeProps) {
  const colorMap = COLOR_MAP[kind] as Record<string, string>
  const dotMap = DOT_MAP[kind] as Record<string, string>
  const colorClass =
    colorMap[status] ?? (category ? CATEGORY_COLOR_CLASS[category] : STATUS_COLORS.task.Todo)
  const dotColor = dotMap[status] ?? (category ? CATEGORY_DOT_COLOR[category] : CHART_COLORS.single)

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
