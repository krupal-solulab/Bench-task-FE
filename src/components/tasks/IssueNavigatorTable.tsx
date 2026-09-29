import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
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
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { GripVertical } from 'lucide-react'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { TableSkeleton } from '@/components/common/Skeleton'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { IssueTypeBadge } from '@/components/common/IssueTypeBadge'
import { OverdueBadge } from '@/components/common/OverdueBadge'
import { Avatar } from '@/components/common/Avatar'
import { UserSelect } from '@/components/common/UserSelect'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUpdateAnyTask, useUpdateAnyTaskAssignee } from '@/hooks/mutations/useTaskMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import { formatDate } from '@/lib/date'
import { cn } from '@/lib/cn'
import {
  readColumnLayout,
  resolveColumnOrder,
  writeColumnLayout,
} from '@/lib/issue-navigator-columns'
import { TASK_PRIORITIES } from '@/types/task.types'
import type { Task } from '@/types/task.types'

interface ColumnDef {
  key: string
  label: string
  defaultWidth: number
  render: (task: Task) => ReactNode
}

const MIN_COLUMN_WIDTH = 80

/** Inline-editable priority cell (Module 4 gap-closure: "inline-edit") - reuses useUpdateAnyTask,
 * the exact "id passed per-call" hook the Roadmap's drag handler already established, since a
 * shared table can't call a per-task hook conditionally once per cell. Stops row-click propagation
 * so clicking into the editor doesn't also navigate to the task detail page. */
function PriorityCell({ task }: { task: Task }) {
  const [editing, setEditing] = useState(false)
  const updateTask = useUpdateAnyTask()
  const { showToast } = useToast()

  if (!editing) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setEditing(true)
        }}
        className="rounded hover:opacity-80"
      >
        <PriorityBadge priority={task.priority} />
      </button>
    )
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Select
        value={task.priority}
        onValueChange={(value) => {
          setEditing(false)
          updateTask.mutate(
            { id: task.id, priority: value as Task['priority'] },
            {
              onError: (err) =>
                showToast({
                  title: 'Could not update priority',
                  description: toApiError(err).message,
                  variant: 'destructive',
                }),
            },
          )
        }}
        onOpenChange={(open) => !open && setEditing(false)}
        defaultOpen
      >
        <SelectTrigger aria-label={`Priority for ${task.title}`} className="h-8 w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TASK_PRIORITIES.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/** Inline-editable assignee cell - same shape as PriorityCell, reusing the existing UserSelect
 * (org-wide assignable-users list) rather than inventing a second picker. */
function AssigneeCell({ task }: { task: Task }) {
  const [editing, setEditing] = useState(false)
  const updateAssignee = useUpdateAnyTaskAssignee()
  const { showToast } = useToast()

  if (!editing) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setEditing(true)
        }}
        className="rounded hover:opacity-80"
      >
        {task.assignee ? <Avatar name={task.assignee.name} size="sm" /> : '—'}
      </button>
    )
  }

  return (
    <div onClick={(e) => e.stopPropagation()} className="w-40">
      <UserSelect
        value={task.assignee?.id ?? null}
        onChange={(value) => {
          setEditing(false)
          updateAssignee.mutate(
            { id: task.id, assignee: value },
            {
              onError: (err) =>
                showToast({
                  title: 'Could not update assignee',
                  description: toApiError(err).message,
                  variant: 'destructive',
                }),
            },
          )
        }}
      />
    </div>
  )
}

const COLUMNS: ColumnDef[] = [
  { key: 'title', label: 'Title', defaultWidth: 280, render: (t) => t.title },
  {
    key: 'issueType',
    label: 'Type',
    defaultWidth: 110,
    render: (t) => <IssueTypeBadge issueType={t.issueType} />,
  },
  { key: 'project', label: 'Project', defaultWidth: 160, render: (t) => t.project.name },
  {
    key: 'status',
    label: 'Status',
    defaultWidth: 130,
    render: (t) => <StatusBadge status={t.status} kind="task" category={t.statusCategory} />,
  },
  {
    key: 'priority',
    label: 'Priority',
    defaultWidth: 100,
    render: (t) => <PriorityCell task={t} />,
  },
  {
    key: 'assignee',
    label: 'Assignee',
    defaultWidth: 160,
    render: (t) => <AssigneeCell task={t} />,
  },
  {
    key: 'dueDate',
    label: 'Due date',
    defaultWidth: 150,
    render: (t) => (
      <span className="flex items-center gap-1">
        {formatDate(t.dueDate)}
        <OverdueBadge dueDate={t.dueDate} status={t.status} isDone={t.statusCategory === 'Done'} />
      </span>
    ),
  },
]
const COLUMN_KEYS = COLUMNS.map((c) => c.key)
const COLUMN_BY_KEY = new Map(COLUMNS.map((c) => [c.key, c]))

interface HeaderCellProps {
  column: ColumnDef
  width: number
  onResizeStart: (key: string, startX: number, startWidth: number) => void
}

function HeaderCell({ column, width, onResizeStart }: HeaderCellProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: column.key,
  })
  const style = {
    transform: transform ? `translate3d(${transform.x}px, 0, 0)` : undefined,
    width,
  }

  return (
    <th
      ref={setNodeRef}
      style={style}
      scope="col"
      className={cn(
        'relative select-none border-r px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground last:border-r-0',
        isDragging && 'opacity-50',
      )}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder ${column.label}`}
          className="cursor-grab touch-none text-muted-foreground/60 hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <span className="normal-case tracking-normal">{column.label}</span>
      </div>
      <div
        role="separator"
        aria-label={`Resize ${column.label} column`}
        onMouseDown={(e) => {
          e.preventDefault()
          onResizeStart(column.key, e.clientX, width)
        }}
        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-primary/30"
      />
    </th>
  )
}

export interface IssueNavigatorTableProps {
  tasks: Task[]
  isLoading: boolean
  isError: boolean
  errorMessage?: string
  onRetry: () => void
}

/**
 * Module 4 gap-closure: the Issue Navigator's "spreadsheet-style issue table" gains real column
 * reorder (drag a header, dnd-kit - the same library BacklogBoard/DashboardCustomizeForm already
 * use, just horizontal), column resize (a mouse-drag handle per header, the same manual-listener
 * pattern the Roadmap's Gantt-bar drag already established), and inline-edit for priority/assignee
 * (the two fields that don't depend on a project's own workflow-legal-transition rules - status is
 * deliberately left to the task detail page, since a JQL result set can span many projects, each
 * with its own workflow, and resolving per-row legal transitions here would be a much larger,
 * separately-scoped feature). Kept as its own component (not a DataTable variant) so none of
 * DataTable's 20+ other consumers are put at any risk by this table's very different feature set.
 */
export function IssueNavigatorTable({
  tasks,
  isLoading,
  isError,
  errorMessage,
  onRetry,
}: IssueNavigatorTableProps) {
  const navigate = useNavigate()
  const [order, setOrder] = useState<string[]>(() =>
    resolveColumnOrder(readColumnLayout()?.order ?? null, COLUMN_KEYS),
  )
  const [widths, setWidths] = useState<Record<string, number>>(() => {
    const saved = readColumnLayout()?.widths ?? {}
    return Object.fromEntries(COLUMNS.map((c) => [c.key, saved[c.key] ?? c.defaultWidth]))
  })
  const resizing = useRef<{ key: string; startX: number; startWidth: number } | null>(null)

  useEffect(() => {
    writeColumnLayout({ order, widths })
  }, [order, widths])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = order.indexOf(active.id as string)
    const newIndex = order.indexOf(over.id as string)
    if (oldIndex === -1 || newIndex === -1) return
    setOrder(arrayMove(order, oldIndex, newIndex))
  }

  function handleResizeStart(key: string, startX: number, startWidth: number) {
    resizing.current = { key, startX, startWidth }
    function onMouseMove(e: MouseEvent) {
      if (!resizing.current) return
      const delta = e.clientX - resizing.current.startX
      const nextWidth = Math.max(MIN_COLUMN_WIDTH, resizing.current.startWidth + delta)
      setWidths((prev) => ({ ...prev, [resizing.current!.key]: nextWidth }))
    }
    function onMouseUp() {
      resizing.current = null
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const orderedColumns = useMemo(
    () => order.map((key) => COLUMN_BY_KEY.get(key)).filter((c): c is ColumnDef => !!c),
    [order],
  )

  if (isLoading) return <TableSkeleton columns={orderedColumns.length} />
  if (isError)
    return <ErrorState message={errorMessage ?? 'Failed to load data.'} onRetry={onRetry} />
  if (tasks.length === 0) {
    return (
      <EmptyState
        title="No matching issues"
        description="Try a different query, or check the field/operator spelling."
      />
    )
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border bg-card shadow-soft">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <table className="text-sm" style={{ tableLayout: 'fixed', width: '100%' }}>
          <thead className="bg-muted/40">
            <SortableContext items={order} strategy={horizontalListSortingStrategy}>
              <tr>
                {orderedColumns.map((column) => (
                  <HeaderCell
                    key={column.key}
                    column={column}
                    width={widths[column.key] ?? column.defaultWidth}
                    onResizeStart={handleResizeStart}
                  />
                ))}
              </tr>
            </SortableContext>
          </thead>
          <tbody className="divide-y">
            {tasks.map((task) => (
              <tr
                key={task.id}
                onClick={() => navigate(`/tasks/${task.id}`)}
                className="cursor-pointer transition-colors duration-150 hover:bg-accent/40"
              >
                {orderedColumns.map((column) => (
                  <td
                    key={column.key}
                    style={{ width: widths[column.key] ?? column.defaultWidth }}
                    className="truncate border-r px-4 py-3 last:border-r-0"
                  >
                    {column.render(task)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </DndContext>
    </div>
  )
}
