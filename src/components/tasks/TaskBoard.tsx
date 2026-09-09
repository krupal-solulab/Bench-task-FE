import type { ReactNode } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/common/Avatar'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { OverdueBadge } from '@/components/common/OverdueBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { StaggerContainer, StaggerItem } from '@/components/common/Stagger'
import { TaskStatusControl } from './TaskStatusControl'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/hooks/useAuth'
import { useUpdateAnyTaskStatus } from '@/hooks/mutations/useTaskMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import { canDragTaskTo } from '@/lib/status-transitions'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/date'
import { TASK_STATUSES, type Task, type TaskStatus } from '@/types/task.types'

const COLUMN_ACCENT: Record<(typeof TASK_STATUSES)[number], string> = {
  Todo: 'bg-slate-400',
  'In Progress': 'bg-blue-500',
  Review: 'bg-amber-500',
  Done: 'bg-emerald-500',
}

function BoardColumn({ status, children }: { status: TaskStatus; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'space-y-2 rounded-lg p-1 transition-colors',
        isOver && 'bg-primary/5 ring-1 ring-inset ring-primary/20',
      )}
    >
      {children}
    </div>
  )
}

/** Draggable only when `canDrag` - matches the exact permission a Developer already has via the
 * dropdown, so drag-and-drop never allows anything TaskStatusControl wouldn't already allow. */
function DraggableCard({
  task,
  canDrag,
  children,
}: {
  task: Task
  canDrag: boolean
  children: ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: !canDrag,
  })
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(canDrag ? attributes : {})}
      {...(canDrag ? listeners : {})}
      className={cn(
        'relative',
        isDragging && 'z-10 opacity-60',
        canDrag && 'cursor-grab touch-none active:cursor-grabbing',
      )}
    >
      {children}
    </div>
  )
}

export function TaskBoard({ tasks }: { tasks: Task[] }) {
  const { canEditTaskField } = usePermissions()
  const { user } = useAuth()
  const updateStatus = useUpdateAnyTaskStatus()
  const { showToast } = useToast()

  // A short activation distance lets dnd-kit tell a real drag apart from an ordinary click on the
  // task title link or the status dropdown inside the card - clicks under the threshold are never
  // intercepted as a drag, so both keep working exactly as before.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  )

  if (tasks.length === 0) {
    return <EmptyState title="No tasks yet" description="Create a task to populate the board." />
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const task = active.data.current?.task as Task | undefined
    const targetStatus = over.id as TaskStatus
    if (!task || task.status === targetStatus) return

    if (!canDragTaskTo(task, targetStatus, user?.role, user?.id)) {
      showToast({ title: 'That status change is not allowed', variant: 'destructive' })
      return
    }

    updateStatus.mutate(
      { id: task.id, status: targetStatus },
      {
        onSuccess: () => showToast({ title: `Task moved to ${targetStatus}`, variant: 'success' }),
        onError: (err) =>
          showToast({
            title: 'Could not change status',
            description: toApiError(err).message,
            variant: 'destructive',
          }),
      },
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
              <BoardColumn status={status}>
                <StaggerContainer className="space-y-2">
                  {columnTasks.map((task) => {
                    const isAssignee = task.assignee?.id === user?.id
                    const canEdit = canEditTaskField(isAssignee ? 'status' : 'other', isAssignee)
                    return (
                      <StaggerItem key={task.id}>
                        <DraggableCard task={task} canDrag={canEdit}>
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
                        </DraggableCard>
                      </StaggerItem>
                    )
                  })}
                </StaggerContainer>
              </BoardColumn>
            </div>
          )
        })}
      </div>
    </DndContext>
  )
}
