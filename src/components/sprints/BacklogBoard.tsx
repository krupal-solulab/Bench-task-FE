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
import { DatePicker } from '@/components/common/DatePicker'
import { Modal } from '@/components/common/Modal'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { ReleaseMultiSelect } from '@/components/releases/ReleaseMultiSelect'
import { TagInput } from '@/components/common/TagInput'
import { UserSelect } from '@/components/common/UserSelect'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useBulkAssign,
  useBulkCustomField,
  useBulkDeleteTasks,
  useBulkFixVersion,
  useBulkMoveProject,
  useBulkMoveSprint,
  useBulkRelabel,
  useBulkUpdatePriority,
  useBulkUpdateStatus,
  usePreviewBulkStatus,
  useUndoBulkOperation,
  useUpdateAnyTaskRank,
  useUpdateTaskSprint,
} from '@/hooks/mutations/useTaskMutations'
import { useEffectiveCustomFields, useProjects } from '@/hooks/queries/useProjects'
import { useToast } from '@/hooks/useToast'
import { computeReorderNeighbors } from '@/lib/backlog-reorder'
import { toApiError } from '@/lib/error'
import { cn } from '@/lib/cn'
import {
  TASK_PRIORITIES,
  type BulkOperationResult,
  type BulkStatusPreviewResult,
  type TaskPriority,
} from '@/types/task.types'
import type { CustomFieldDefinition } from '@/types/project.types'
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

/** Module 5 gap-closure: a compact, per-type value input for the bulk custom-field editor -
 * mirrors TaskForm's per-type field rendering (Text/Number/Date/Dropdown/Checkbox/MultiSelect/
 * UserPicker), just driven by a flat value/onChange instead of react-hook-form's setValue. */
function BulkCustomFieldValueInput({
  field,
  value,
  onChange,
}: {
  field: CustomFieldDefinition
  value: unknown
  onChange: (value: unknown) => void
}) {
  if (field.type === 'Text') {
    return (
      <Input
        className="w-40"
        value={(value as string | undefined) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.name}
      />
    )
  }
  if (field.type === 'Number') {
    return (
      <Input
        className="w-40"
        type="number"
        value={(value as number | undefined) ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        placeholder={field.name}
      />
    )
  }
  if (field.type === 'Date') {
    return (
      <DatePicker
        value={(value as string | null | undefined) ?? null}
        onChange={(v) => onChange(v)}
      />
    )
  }
  if (field.type === 'Dropdown') {
    return (
      <Select value={(value as string | undefined) ?? ''} onValueChange={onChange}>
        <SelectTrigger className="w-40" aria-label={field.name}>
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          {(field.options ?? []).map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }
  if (field.type === 'Checkbox') {
    return (
      <Select
        value={value === true ? 'true' : value === false ? 'false' : ''}
        onValueChange={(v) => onChange(v === 'true')}
      >
        <SelectTrigger className="w-28" aria-label={field.name}>
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Yes</SelectItem>
          <SelectItem value="false">No</SelectItem>
        </SelectContent>
      </Select>
    )
  }
  if (field.type === 'MultiSelect') {
    return (
      <div className="w-40">
        <TagInput
          value={(value as string[] | undefined) ?? []}
          onChange={onChange}
          suggestions={field.options ?? []}
          placeholder="Pick an option"
        />
      </div>
    )
  }
  // UserPicker
  return (
    <div className="w-40">
      <UserSelect
        value={(value as string | null | undefined) ?? null}
        onChange={onChange}
        placeholder={field.name}
      />
    </div>
  )
}

/** The confirmation step for Module 5's bulk status-transition preview (BRD gap-closure: "no way
 * to know before committing which tasks would fail"). Shown between picking a status and actually
 * committing it - Confirm re-runs the real bulk-status call, Cancel discards the draft entirely. */
function BulkStatusPreviewModal({
  status,
  result,
  isSubmitting,
  onCancel,
  onConfirm,
}: {
  status: string
  result: BulkStatusPreviewResult
  isSubmitting: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Modal
      open
      onOpenChange={(open) => !open && onCancel()}
      title={`Transition to "${status}"`}
      description={`${result.willSucceedCount} would succeed, ${result.willFailCount} would fail.`}
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            loading={isSubmitting}
            disabled={result.willSucceedCount === 0}
            onClick={onConfirm}
          >
            Confirm
          </Button>
        </>
      }
    >
      <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
        {result.entries.map((entry) => (
          <li
            key={entry.taskId}
            className={cn(
              'rounded px-2 py-1',
              entry.willSucceed ? 'text-muted-foreground' : 'bg-destructive/10 text-destructive',
            )}
          >
            {entry.willSucceed ? 'Will succeed' : (entry.reason ?? 'Will fail')}
          </li>
        ))}
      </ul>
    </Modal>
  )
}

/** The bulk action bar shown once at least one row is selected (BRD 6.2: "move multiple issues
 * into a sprint, bulk-assign, bulk-relabel"). Each action clears the selection on success. */
function BulkActionBar({
  selectedIds,
  projectId,
  assignableSprints,
  statusOptions,
  onDone,
}: {
  selectedIds: string[]
  projectId: string
  assignableSprints: Sprint[]
  statusOptions: string[]
  onDone: () => void
}) {
  const [labelDraft, setLabelDraft] = useState<string[]>([])
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [fixVersionDraft, setFixVersionDraft] = useState<string[]>([])
  const [customFieldId, setCustomFieldId] = useState('')
  const [customFieldValue, setCustomFieldValue] = useState<unknown>(undefined)
  const [statusPreview, setStatusPreview] = useState<{
    status: string
    result: BulkStatusPreviewResult
  } | null>(null)
  const bulkMoveSprint = useBulkMoveSprint()
  const bulkAssign = useBulkAssign()
  const bulkRelabel = useBulkRelabel()
  const bulkStatus = useBulkUpdateStatus()
  const bulkPriority = useBulkUpdatePriority()
  const bulkDelete = useBulkDeleteTasks()
  const bulkFixVersion = useBulkFixVersion()
  const bulkCustomField = useBulkCustomField()
  const bulkMoveProject = useBulkMoveProject()
  const previewBulkStatus = usePreviewBulkStatus()
  const undoBulkOperation = useUndoBulkOperation()
  const { data: customFields } = useEffectiveCustomFields(projectId)
  const { data: projectsData } = useProjects({ limit: 100, sortBy: 'name', sortOrder: 'asc' })
  const { showToast } = useToast()

  const otherProjects = (projectsData?.data ?? []).filter((p) => p.id !== projectId)
  const selectedCustomField = (customFields ?? []).find((f) => f.id === customFieldId)

  async function handleUndo(logId: string) {
    try {
      const result = await undoBulkOperation.mutateAsync(logId)
      showToast({
        title:
          result.failed.length > 0
            ? `Undo: ${result.succeeded.length} reverted, ${result.failed.length} failed`
            : `Undo: ${result.succeeded.length} task(s) reverted`,
        variant: result.failed.length > 0 ? 'destructive' : 'success',
      })
    } catch (err) {
      showToast({
        title: 'Could not undo',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  function reportResult(action: string, result: BulkOperationResult) {
    const undoAction = result.undoToken
      ? { label: 'Undo', onClick: () => void handleUndo(result.undoToken!) }
      : undefined
    if (result.failed.length > 0) {
      showToast({
        title: `${action}: ${result.succeeded.length} succeeded, ${result.failed.length} failed`,
        variant: 'destructive',
        action: undoAction,
      })
    } else {
      showToast({
        title: `${action}: ${result.succeeded.length} task(s) updated`,
        variant: 'success',
        action: undoAction,
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

  /** Module 5 gap-closure: dry-runs the transition first (opens BulkStatusPreviewModal) rather
   * than committing directly - handleConfirmStatus below fires the real bulk-status call. */
  async function handlePreviewStatus(status: string) {
    try {
      const result = await previewBulkStatus.mutateAsync({ taskIds: selectedIds, status })
      setStatusPreview({ status, result })
    } catch (err) {
      showToast({
        title: 'Could not preview status change',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleConfirmStatus() {
    if (!statusPreview) return
    try {
      const result = await bulkStatus.mutateAsync({
        taskIds: selectedIds,
        status: statusPreview.status,
      })
      reportResult('Set status', result)
    } catch (err) {
      showToast({
        title: 'Could not update status',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    } finally {
      setStatusPreview(null)
    }
  }

  async function handleApplyFixVersion() {
    if (fixVersionDraft.length === 0) return
    try {
      const result = await bulkFixVersion.mutateAsync({
        taskIds: selectedIds,
        fixVersions: fixVersionDraft,
      })
      setFixVersionDraft([])
      reportResult('Fix version', result)
    } catch (err) {
      showToast({
        title: 'Could not set fix version',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleApplyCustomField() {
    if (!customFieldId) return
    try {
      const result = await bulkCustomField.mutateAsync({
        taskIds: selectedIds,
        fieldId: customFieldId,
        value: customFieldValue,
      })
      setCustomFieldId('')
      setCustomFieldValue(undefined)
      reportResult('Custom field', result)
    } catch (err) {
      showToast({
        title: 'Could not set custom field',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleMoveToProject(targetProjectId: string) {
    try {
      const result = await bulkMoveProject.mutateAsync({
        taskIds: selectedIds,
        targetProjectId,
      })
      reportResult('Move to project', result)
    } catch (err) {
      showToast({
        title: 'Could not move tasks',
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
          aria-label="Apply labels"
          onClick={() => void handleAddLabels()}
          disabled={labelDraft.length === 0}
        >
          Apply
        </Button>
      </div>

      {statusOptions.length > 0 && (
        <Select value="" onValueChange={(v) => void handlePreviewStatus(v)}>
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

      <div className="flex items-center gap-1">
        <div className="w-40">
          <ReleaseMultiSelect
            projectId={projectId}
            value={fixVersionDraft}
            onChange={setFixVersionDraft}
            placeholder="Fix version…"
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label="Apply fix version"
          onClick={() => void handleApplyFixVersion()}
          disabled={fixVersionDraft.length === 0}
        >
          Apply
        </Button>
      </div>

      {(customFields ?? []).length > 0 && (
        <div className="flex items-center gap-1">
          <Select
            value={customFieldId}
            onValueChange={(v) => {
              setCustomFieldId(v)
              setCustomFieldValue(undefined)
            }}
          >
            <SelectTrigger className="w-40" aria-label="Bulk set custom field">
              <SelectValue placeholder="Custom field…" />
            </SelectTrigger>
            <SelectContent>
              {(customFields ?? []).map((field) => (
                <SelectItem key={field.id} value={field.id}>
                  {field.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedCustomField && (
            <BulkCustomFieldValueInput
              field={selectedCustomField}
              value={customFieldValue}
              onChange={setCustomFieldValue}
            />
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label="Apply custom field"
            onClick={() => void handleApplyCustomField()}
            disabled={!customFieldId}
          >
            Apply
          </Button>
        </div>
      )}

      {otherProjects.length > 0 && (
        <Select value="" onValueChange={(v) => void handleMoveToProject(v)}>
          <SelectTrigger className="w-40" aria-label="Bulk move to project">
            <SelectValue placeholder="Move to project" />
          </SelectTrigger>
          <SelectContent>
            {otherProjects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

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

      {statusPreview && (
        <BulkStatusPreviewModal
          status={statusPreview.status}
          result={statusPreview.result}
          isSubmitting={bulkStatus.isPending}
          onCancel={() => setStatusPreview(null)}
          onConfirm={() => void handleConfirmStatus()}
        />
      )}
    </div>
  )
}

export interface BacklogBoardProps {
  tasks: Task[]
  canManage: boolean
  assignableSprints: Sprint[]
  projectId: string
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

export function BacklogBoard({
  tasks,
  canManage,
  assignableSprints,
  projectId,
}: BacklogBoardProps) {
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
          projectId={projectId}
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
