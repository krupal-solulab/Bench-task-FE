import { Link } from 'react-router-dom'
import { Avatar } from '@/components/common/Avatar'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { OverdueBadge } from '@/components/common/OverdueBadge'
import { formatDate } from '@/lib/date'
import type { Task } from '@/types/task.types'

export function TaskCard({ task }: { task: Task }) {
  return (
    <Link
      to={`/tasks/${task.id}`}
      className="block space-y-2 rounded-md border bg-card p-3 text-sm shadow-sm transition-colors hover:border-foreground/30"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium leading-snug">{task.title}</p>
        <PriorityBadge priority={task.priority} />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          {formatDate(task.dueDate)}
          <OverdueBadge dueDate={task.dueDate} status={task.status} />
        </span>
        {task.assignee && <Avatar name={task.assignee.name} size="sm" />}
      </div>
    </Link>
  )
}
