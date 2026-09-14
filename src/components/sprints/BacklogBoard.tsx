import { useEffect, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { GripVertical } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/common/Avatar'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { EmptyState } from '@/components/common/EmptyState'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUpdateAnyTaskRank, useUpdateTaskSprint } from '@/hooks/mutations/useTaskMutations'
import { useToast } from '@/hooks/useToast'
import { computeReorderNeighbors } from '@/lib/backlog-reorder'
import { toApiError } from '@/lib/error'
import { cn } from '@/lib/cn'
import type { Sprint } from '@/types/sprint.types'
import type { Task } from '@/types/task.types'

interface BacklogRowProps {
  task: Task
  canManage: boolean
  assignableSprints: Sprint[]
}

/** A single draggable backlog row - draggable only when canManage, matching the same permission
 * the "Move to sprint" picker is gated on, so drag-to-reorder never allows anything the rest of
 * the row's controls wouldn't already allow. */
function BacklogRow({ task, canManage, assignableSprints }: BacklogRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !canManage,
  })
  const updateSprint = useUpdateTaskSprint(task.id)
  const { showToast } = useToast()

  const style = {
    transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
    transition,
  }

  async function handleMoveToSprint(sprintId: string) {
    try {
      await updateSprint.mutateAsync({ sprintId })
      showToast({ title: 'Task moved to sprint', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not move task',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm shadow-soft transition-colors',
        isDragging && 'z-10 opacity-60',
      )}
    >
      {canManage && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}

      <Link to={`/tasks/${task.id}`} className="flex-1 truncate font-medium hover:text-primary">
        {task.title}
      </Link>

      <PriorityBadge priority={task.priority} />
      {task.assignee && <Avatar name={task.assignee.name} size="sm" />}

      {canManage && assignableSprints.length > 0 && (
        <Select value="" onValueChange={(v) => void handleMoveToSprint(v)}>
          <SelectTrigger className="w-40" aria-label="Move to sprint">
            <SelectValue placeholder="Move to sprint" />
          </SelectTrigger>
          <SelectContent>
            {assignableSprints.map((sprint) => (
              <SelectItem key={sprint.id} value={sprint.id}>
                {sprint.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}

export interface BacklogBoardProps {
  tasks: Task[]
  canManage: boolean
  assignableSprints: Sprint[]
}

export function BacklogBoard({ tasks, canManage, assignableSprints }: BacklogBoardProps) {
  const [orderedIds, setOrderedIds] = useState(() => tasks.map((t) => t.id))
  const updateRank = useUpdateAnyTaskRank()
  const { showToast } = useToast()

  useEffect(() => {
    setOrderedIds(tasks.map((t) => t.id))
  }, [tasks])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  if (tasks.length === 0) {
    return (
      <EmptyState title="Backlog is empty" description="Create a task to populate the backlog." />
    )
  }

  const tasksById = new Map(tasks.map((t) => [t.id, t]))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeId = String(active.id)
    const overId = String(over.id)
    const oldIndex = orderedIds.indexOf(activeId)
    const newIndex = orderedIds.indexOf(overId)
    if (oldIndex === -1 || newIndex === -1) return

    const previousOrder = orderedIds
    const reordered = arrayMove(orderedIds, oldIndex, newIndex)
    setOrderedIds(reordered)

    const { beforeTaskId, afterTaskId } = computeReorderNeighbors(reordered, activeId)
    updateRank.mutate(
      { id: activeId, beforeTaskId, afterTaskId },
      {
        onError: (err) => {
          setOrderedIds(previousOrder)
          showToast({
            title: 'Could not reorder task',
            description: toApiError(err).message,
            variant: 'destructive',
          })
        },
      },
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {orderedIds.map((id) => {
            const task = tasksById.get(id)
            if (!task) return null
            return (
              <BacklogRow
                key={id}
                task={task}
                canManage={canManage}
                assignableSprints={assignableSprints}
              />
            )
          })}
        </div>
      </SortableContext>
    </DndContext>
  )
}
