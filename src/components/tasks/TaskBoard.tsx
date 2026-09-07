import { Link } from 'react-router-dom'
import { Avatar } from '@/components/common/Avatar'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { OverdueBadge } from '@/components/common/OverdueBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { StaggerContainer, StaggerItem } from '@/components/common/Stagger'
import { TaskStatusControl } from './TaskStatusControl'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/date'
import { TASK_STATUSES, type Task } from '@/types/task.types'

const COLUMN_ACCENT: Record<(typeof TASK_STATUSES)[number], string> = {
  Todo: 'bg-slate-400',
  'In Progress': 'bg-blue-500',
  Review: 'bg-amber-500',
  Done: 'bg-emerald-500',
}

export function TaskBoard({ tasks }: { tasks: Task[] }) {
  const { canEditTaskField } = usePermissions()
  const { user } = useAuth()

  if (tasks.length === 0) {
    return <EmptyState title="No tasks yet" description="Create a task to populate the board." />
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {TASK_STATUSES.map((status) => {
        const columnTasks = tasks.filter((t) => t.status === status)
        return (
          <div key={status} className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <span className={cn('h-2 w-2 rounded-full', COLUMN_ACCENT[status])} />
              <h3 className="text-sm font-medium">{status}</h3>
              <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {columnTasks.length}
              </span>
            </div>
            <StaggerContainer className="space-y-2">
              {columnTasks.map((task) => {
                const isAssignee = task.assignee?.id === user?.id
                const canEdit = canEditTaskField(isAssignee ? 'status' : 'other', isAssignee)
                return (
                  <StaggerItem key={task.id}>
                    <div className="group space-y-2 rounded-lg border bg-card p-3 text-sm shadow-soft transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card-hover">
                      <Link
                        to={`/tasks/${task.id}`}
                        className="block font-medium leading-snug transition-colors group-hover:text-primary"
                      >
                        {task.title}
                      </Link>
                      <div className="flex items-center justify-between">
                        <PriorityBadge priority={task.priority} />
                        {task.assignee && <Avatar name={task.assignee.name} size="sm" />}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {formatDate(task.dueDate)}
                        <OverdueBadge dueDate={task.dueDate} status={task.status} />
                      </div>
                      <TaskStatusControl task={task} canEdit={canEdit} />
                    </div>
                  </StaggerItem>
                )
              })}
            </StaggerContainer>
          </div>
        )
      })}
    </div>
  )
}
