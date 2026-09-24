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
import { Button } from '@/components/common/Button'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { TagInput } from '@/components/common/TagInput'
import { UserSelect } from '@/components/common/UserSelect'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useBulkAssign,
  useBulkDeleteTasks,
  useBulkMoveSprint,
  useBulkRelabel,
  useBulkUpdatePriority,
  useBulkUpdateStatus,
  useUpdateAnyTaskRank,
  useUpdateTaskSprint,
} from '@/hooks/mutations/useTaskMutations'
import { useToast } from '@/hooks/useToast'
import { computeReorderNeighbors } from '@/lib/backlog-reorder'
import { toApiError } from '@/lib/error'
import { cn } from '@/lib/cn'
import { TASK_PRIORITIES, type TaskPriority } from '@/types/task.types'
import type { Sprint } from '@/types/sprint.types'
import type { Task } from '@/types/task.types'

interface BacklogRowProps {
  task: Task
  canManage: boolean
  assignableSprints: Sprint[]
  selected: boolean
  onToggleSelected: (taskId: string, selected: boolean) => void
  /** Drag-to-reorder is disabled while grouped by epic (rank order across group boundaries is
   * ambiguous) - distinct from `canManage`, since selection/move-to-sprint stay available. */
  canDrag: boolean
}

/** A single draggable backlog row - draggable only when canManage, matching the same permission
 * the "Move to sprint" picker is gated on, so drag-to-reorder never allows anything the rest of
 * the row's controls wouldn't already allow. */
function BacklogRow({
  task,
  canManage,
  assignableSprints,
  selected,
  onToggleSelected,
  canDrag,
}: BacklogRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !canManage || !canDrag,
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
        <Checkbox
          aria-label={`Select ${task.title}`}
          checked={selected}
          onCheckedChange={(checked) => onToggleSelected(task.id, checked === true)}
        />
      )}

      {canManage && canDrag && (
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

/** The bulk action bar shown once at least one row is selected (BRD 6.2: "move multiple issues
 * into a sprint, bulk-assign, bulk-relabel"). Each action clears the selection on success. */
function BulkActionBar({
  selectedIds,
  assignableSprints,
  statusOptions,
  onDone,
}: {
  selectedIds: string[]
  assignableSprints: Sprint[]
  statusOptions: string[]
  onDone: () => void
}) {
  const [labelDraft, setLabelDraft] = useState<string[]>([])
  const [deleteOpen, setDeleteOpen] = useState(false)
  const bulkMoveSprint = useBulkMoveSprint()
  const bulkAssign = useBulkAssign()
  const bulkRelabel = useBulkRelabel()
  const bulkStatus = useBulkUpdateStatus()
  const bulkPriority = useBulkUpdatePriority()
  const bulkDelete = useBulkDeleteTasks()
  const { showToast } = useToast()

  function reportResult(action: string, result: { succeeded: string[]; failed: unknown[] }) {
    if (result.failed.length > 0) {
      showToast({
        title: `${action}: ${result.succeeded.length} succeeded, ${result.failed.length} failed`,
        variant: 'destructive',
      })
    } else {
      showToast({
        title: `${action}: ${result.succeeded.length} task(s) updated`,
        variant: 'success',
      })
    }
    onDone()
  }

  async function handleMoveToSprint(sprintId: string) {
    try {
      const result = await bulkMoveSprint.mutateAsync({ taskIds: selectedIds, sprintId })
      reportResult('Move to sprint', result)
    } catch (err) {
      showToast({
        title: 'Could not move tasks',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleAssign(assignee: string | null) {
    try {
      const result = await bulkAssign.mutateAsync({ taskIds: selectedIds, assignee })
      reportResult('Assign', result)
    } catch (err) {
      showToast({
        title: 'Could not assign tasks',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleAddLabels() {
    if (labelDraft.length === 0) return
    try {
      const result = await bulkRelabel.mutateAsync({ taskIds: selectedIds, labels: labelDraft })
      setLabelDraft([])
      reportResult('Add labels', result)
    } catch (err) {
      showToast({
        title: 'Could not label tasks',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleSetStatus(status: string) {
    try {
      const result = await bulkStatus.mutateAsync({ taskIds: selectedIds, status })
      reportResult('Set status', result)
    } catch (err) {
      showToast({
        title: 'Could not update status',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleSetPriority(priority: TaskPriority) {
    try {
      const result = await bulkPriority.mutateAsync({ taskIds: selectedIds, priority })
      reportResult('Set priority', result)
    } catch (err) {
      showToast({
        title: 'Could not update priority',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleDelete() {
    try {
      const result = await bulkDelete.mutateAsync({ taskIds: selectedIds })
      reportResult('Delete', result)
    } catch (err) {
      showToast({
        title: 'Could not delete tasks',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-accent/40 px-3 py-2 text-sm">
      <span className="font-medium">{selectedIds.length} selected</span>

      {assignableSprints.length > 0 && (
        <Select value="" onValueChange={(v) => void handleMoveToSprint(v)}>
          <SelectTrigger className="w-40" aria-label="Bulk move to sprint">
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

      <div className="w-48">
        <UserSelect value={null} onChange={(v) => void handleAssign(v)} placeholder="Assign to…" />
      </div>

      <div className="flex items-center gap-1">
        <div className="w-48">
          <TagInput value={labelDraft} onChange={setLabelDraft} placeholder="Add label(s)…" />
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void handleAddLabels()}
          disabled={labelDraft.length === 0}
        >
          Apply
        </Button>
      </div>

      {statusOptions.length > 0 && (
        <Select value="" onValueChange={(v) => void handleSetStatus(v)}>
          <SelectTrigger className="w-40" aria-label="Bulk set status">
            <SelectValue placeholder="Set status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select value="" onValueChange={(v) => void handleSetPriority(v as TaskPriority)}>
        <SelectTrigger className="w-32" aria-label="Bulk set priority">
          <SelectValue placeholder="Set priority" />
        </SelectTrigger>
        <SelectContent>
          {TASK_PRIORITIES.map((priority) => (
            <SelectItem key={priority} value={priority}>
              {priority}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button type="button" size="sm" variant="destructive" onClick={() => setDeleteOpen(true)}>
        Delete
      </Button>

      <Button type="button" size="sm" variant="ghost" className="ml-auto" onClick={onDone}>
        Clear selection
      </Button>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete selected tasks"
        description={`This will delete ${selectedIds.length} task(s). This cannot be undone.`}
        variant="destructive"
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  )
}

export interface BacklogBoardProps {
  tasks: Task[]
  canManage: boolean
  assignableSprints: Sprint[]
}

/** The bulk "Set status" picker's options - this board doesn't have the project's configured
 * workflow in scope (only a flat Task[]), so it offers every status name already in use among
 * the visible tasks rather than fetching the full workflow just for this one picker - every
 * option offered is guaranteed to be a real, currently valid status in this project. */
function distinctStatuses(tasks: Task[]): string[] {
  return [...new Set(tasks.map((t) => t.status))].sort((a, b) => a.localeCompare(b))
}

/** BRD 6.2's "issues can be grouped/collapsed by parent Epic" - a display-only grouping (drag-to-
 * reorder is disabled while grouped, since rank ordering across group boundaries is ambiguous;
 * see this file's own note on the toggle below). */
function groupByEpic(tasks: Task[]): Array<{ key: string; label: string; tasks: Task[] }> {
  const groups = new Map<string, { key: string; label: string; tasks: Task[] }>()
  for (const task of tasks) {
    const key = task.parent?.id ?? 'no-epic'
    const label = task.parent?.title ?? 'No epic'
    if (!groups.has(key)) groups.set(key, { key, label, tasks: [] })
    groups.get(key)!.tasks.push(task)
  }
  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label))
}

export function BacklogBoard({ tasks, canManage, assignableSprints }: BacklogBoardProps) {
  const [orderedIds, setOrderedIds] = useState(() => tasks.map((t) => t.id))
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [grouped, setGrouped] = useState(false)
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

  function toggleSelected(taskId: string, selected: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (selected) next.add(taskId)
      else next.delete(taskId)
      return next
    })
  }

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

  function renderRow(id: string) {
    const task = tasksById.get(id)
    if (!task) return null
    return (
      <BacklogRow
        key={id}
        task={task}
        canManage={canManage}
        assignableSprints={assignableSprints}
        selected={selectedIds.has(id)}
        onToggleSelected={toggleSelected}
        canDrag={!grouped}
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            aria-label="Group by epic"
            checked={grouped}
            onCheckedChange={(checked) => setGrouped(checked === true)}
          />
          Group by epic
        </label>
        {grouped && (
          <p className="text-xs text-muted-foreground">
            Drag-to-reorder is disabled while grouped by epic.
          </p>
        )}
      </div>

      {canManage && selectedIds.size > 0 && (
        <BulkActionBar
          selectedIds={[...selectedIds]}
          assignableSprints={assignableSprints}
          statusOptions={distinctStatuses(tasks)}
          onDone={() => setSelectedIds(new Set())}
        />
      )}

      {grouped ? (
        <div className="space-y-4">
          {groupByEpic(tasks).map((group) => (
            <div key={group.key} className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">
                {group.label} <span className="font-normal">({group.tasks.length})</span>
              </h4>
              <div className="space-y-2">{group.tasks.map((t) => renderRow(t.id))}</div>
            </div>
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">{orderedIds.map(renderRow)}</div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
