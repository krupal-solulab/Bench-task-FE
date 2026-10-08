import { useState, type CSSProperties, type ReactNode } from 'react'
import { ChevronDown, ChevronsDownUp, ChevronsUpDown, UserX } from 'lucide-react'
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
import { IssueTypeBadge } from '@/components/common/IssueTypeBadge'
import { OverdueBadge } from '@/components/common/OverdueBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { StaggerContainer, StaggerItem } from '@/components/common/Stagger'
import { TaskStatusControl } from './TaskStatusControl'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/hooks/useAuth'
import { useUpdateAnyTaskStatus } from '@/hooks/mutations/useTaskMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import { DEFAULT_WORKFLOW, canDragTaskTo } from '@/lib/status-transitions'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/date'
import type { Task } from '@/types/task.types'
import type { MemberPermissions } from '@/types/project.types'
import type { IssueTypeDefinition } from '@/types/issue-type.types'
import type { StatusCategory, Workflow } from '@/types/workflow.types'

// Column accent color is driven by the status's category (3 buckets), not its literal name, so
// any custom workflow status still gets a sensible, category-consistent color.
const CATEGORY_ACCENT: Record<StatusCategory, string> = {
  'To Do': 'bg-slate-400',
  'In Progress': 'bg-blue-500',
  Done: 'bg-emerald-500',
}

export const SWIMLANE_OPTIONS = ['none', 'assignee', 'priority', 'epic'] as const
export type SwimlaneBy = (typeof SWIMLANE_OPTIONS)[number]

interface Swimlane {
  key: string
  label: string
  tasks: Task[]
  /** Set for an assignee lane - drives the avatar in its header. */
  assigneeName?: string
}

/** Clicks on these inside a card keep their own behaviour instead of opening the popup. */
const INTERACTIVE_SELECTOR =
  'a, button, input, select, textarea, [role="combobox"], [role="option"]'

/** Lanes that collect "nothing set" always sort last, as their own section. */
const CATCH_ALL_LANES = new Set(['unassigned', 'no-epic'])

/** Groups tasks into swimlane rows for the board - a pure display grouping (BRD 6.1's "Swimlanes
 * by assignee, priority, or epic"), never a stored field: dragging a card only ever changes its
 * status column, exactly as before this feature, regardless of which swimlane row it lands in. */
function groupIntoSwimlanes(tasks: Task[], swimlaneBy: SwimlaneBy): Swimlane[] {
  if (swimlaneBy === 'none') return [{ key: 'all', label: '', tasks }]

  const groups = new Map<string, Swimlane>()
  for (const task of tasks) {
    let key: string
    let label: string
    if (swimlaneBy === 'assignee') {
      key = task.assignee?.id ?? 'unassigned'
      label = task.assignee?.name ?? 'Unassigned'
      if (!groups.has(key)) {
        groups.set(key, { key, label, tasks: [], assigneeName: task.assignee?.name })
      }
    } else if (swimlaneBy === 'priority') {
      key = task.priority
      label = task.priority
    } else {
      key = task.parent?.id ?? 'no-epic'
      label = task.parent?.title ?? 'No epic'
    }
    if (!groups.has(key)) groups.set(key, { key, label, tasks: [] })
    groups.get(key)!.tasks.push(task)
  }
  return [...groups.values()].sort((a, b) => {
    const aLast = CATCH_ALL_LANES.has(a.key)
    const bLast = CATCH_ALL_LANES.has(b.key)
    if (aLast !== bLast) return aLast ? 1 : -1
    // Priority lanes read P1 -> P3, which plain string order already gives.
    return a.label.localeCompare(b.label)
  })
}

/** Collapsed swimlanes, remembered per board (e.g. per project + grouping) in this browser. */
function useCollapsedLanes(storageKey: string | undefined) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    if (!storageKey) return new Set()
    try {
      return new Set(JSON.parse(localStorage.getItem(storageKey) ?? '[]') as string[])
    } catch {
      return new Set()
    }
  })
  function update(next: Set<string>) {
    setCollapsed(next)
    if (!storageKey) return
    try {
      localStorage.setItem(storageKey, JSON.stringify([...next]))
    } catch {
      // Storage blocked - collapsing still works for this visit.
    }
  }
  return [collapsed, update] as const
}

/** A droppable column id is scoped to its swimlane row (`${swimlaneKey}::${status}`) so the same
 * status can appear once per swimlane without id collisions - `handleDragEnd` below only reads the
 * status portion back out, since swimlane row is never itself a drop target's effect. */
function columnDroppableId(swimlaneKey: string, status: string): string {
  return `${swimlaneKey}::${status}`
}

function statusFromDroppableId(id: string): string {
  const idx = id.indexOf('::')
  return idx === -1 ? id : id.slice(idx + 2)
}

function BoardColumn({ id, children }: { id: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        // flex-1: an empty column still fills its lane's height, so lanes read as clean columns.
        'min-h-24 flex-1 space-y-2 rounded-lg bg-muted/50 p-2 transition-colors dark:bg-muted/30',
        isOver && 'bg-primary/10 ring-1 ring-inset ring-primary/30',
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

export function TaskBoard({
  tasks,
  workflow = DEFAULT_WORKFLOW,
  grant,
  issueTypeDefinitions,
  swimlaneBy = 'none',
  storageKey,
  onOpenTask,
}: {
  tasks: Task[]
  /** The project's workflow (custom, or the system default). Defaults to the system default
   * when the caller hasn't fetched it yet, matching every existing project's behavior. */
  workflow?: Workflow
  /** The current user's per-project grant (see Phase 3's permission schemes), if any. */
  grant?: MemberPermissions | null
  /** The owning project's resolved issue types, for icon/color - see IssueTypeBadge. */
  issueTypeDefinitions?: IssueTypeDefinition[]
  /** BRD 6.1's "Swimlanes by assignee, priority, or epic" - defaults to 'none' (today's single
   * flat grid), so every existing caller is unaffected until it opts in. */
  swimlaneBy?: SwimlaneBy
  /** Where collapsed swimlanes are remembered (per grouping); omitted = not remembered. */
  storageKey?: string
  /** Opens a card in the quick-view popup; omitted = the title links to the full task page. */
  onOpenTask?: (task: Task) => void
}) {
  const { canEditTaskField } = usePermissions()
  const { user } = useAuth()
  const updateStatus = useUpdateAnyTaskStatus()
  const { showToast } = useToast()
  const [collapsed, setCollapsed] = useCollapsedLanes(
    storageKey ? `${storageKey}:${swimlaneBy}` : undefined,
  )

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

  function toggleLane(key: string) {
    const next = new Set(collapsed)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setCollapsed(next)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const task = active.data.current?.task as Task | undefined
    const targetStatus = statusFromDroppableId(over.id as string)
    if (!task || task.status === targetStatus) return

    if (!canDragTaskTo(task, targetStatus, user?.role, user?.id, workflow, grant)) {
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

  // One grid template for the header row and every lane, so all columns line up (stacked into
  // 2 columns on smaller screens, where each cell carries its own status label instead).
  const gridStyle = {
    '--board-cols': `repeat(${workflow.statuses.length}, minmax(0, 1fr))`,
  } as CSSProperties
  const gridClass = 'grid gap-3 sm:grid-cols-2 lg:[grid-template-columns:var(--board-cols)]'

  function renderColumnHeader(status: string, category: StatusCategory, wipLimit?: number) {
    const count = tasks.filter((t) => t.status === status).length
    const overWipLimit = !!wipLimit && count > wipLimit
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 px-1">
          <span className={cn('h-2 w-2 shrink-0 rounded-full', CATEGORY_ACCENT[category])} />
          <h3 className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {status}
          </h3>
          <span
            className={cn(
              'ml-auto rounded-full px-2 py-0.5 text-xs font-medium',
              overWipLimit
                ? 'bg-destructive/10 text-destructive'
                : 'bg-muted text-muted-foreground',
            )}
            title={wipLimit ? `WIP limit: ${wipLimit}` : undefined}
          >
            {count}
            {wipLimit ? ` / ${wipLimit}` : ''}
          </span>
        </div>
        {overWipLimit && (
          <p className="px-1 text-xs text-destructive">WIP limit exceeded for this column</p>
        )}
      </div>
    )
  }

  function renderCard(task: Task) {
    const isAssignee = task.assignee?.id === user?.id
    // Both the drag handle and TaskStatusControl below are exclusively about status changes, so
    // this always checks the 'status' capability (see canDragTaskTo in status-transitions.ts).
    const canEdit = canEditTaskField('status', isAssignee, grant)
    return (
      <StaggerItem key={task.id}>
        <DraggableCard task={task} canDrag={canEdit}>
          <div
            className={cn(
              'group space-y-2 rounded-lg border bg-card p-3 text-sm shadow-soft transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card-hover',
              onOpenTask && 'cursor-pointer',
            )}
            onClick={(e) => {
              // A click anywhere on the card opens it - except on its own controls (status
              // dropdown, buttons, links), which keep doing their own thing.
              if (!onOpenTask || (e.target as HTMLElement).closest(INTERACTIVE_SELECTOR)) return
              onOpenTask(task)
            }}
          >
            <Link
              to={`/tasks/${task.id}`}
              onClick={(e) => {
                // Plain click opens the popup; ctrl/cmd/shift/middle-click still opens the page.
                if (!onOpenTask || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
                e.preventDefault()
                e.stopPropagation()
                onOpenTask(task)
              }}
              className="block font-medium leading-snug transition-colors group-hover:text-primary"
            >
              {task.title}
            </Link>
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <IssueTypeBadge issueType={task.issueType} definitions={issueTypeDefinitions} />
                <PriorityBadge priority={task.priority} />
              </div>
              {task.assignee && <Avatar name={task.assignee.name} size="sm" />}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {formatDate(task.dueDate)}
              <OverdueBadge
                dueDate={task.dueDate}
                status={task.status}
                isDone={task.statusCategory === 'Done'}
              />
            </div>
            <TaskStatusControl task={task} canEdit={canEdit} workflow={workflow} />
          </div>
        </DraggableCard>
      </StaggerItem>
    )
  }

  /** One row of status columns. `withHeaders`: each column gets its own header (the flat board);
   * otherwise the shared header row above the lanes labels them - plus a small label on narrow
   * screens, where the columns stack and no longer line up with that row. */
  function renderColumns(swimlaneKey: string, laneTasks: Task[], withHeaders: boolean) {
    return (
      <div className={gridClass} style={gridStyle}>
        {workflow.statuses.map(({ name: status, category, wipLimit }) => {
          const columnTasks = laneTasks.filter((t) => t.status === status)
          return (
            <div key={status} className="flex min-w-0 flex-col gap-2">
              {withHeaders ? (
                renderColumnHeader(status, category, wipLimit)
              ) : (
                <p className="flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground lg:hidden">
                  <span className={cn('h-1.5 w-1.5 rounded-full', CATEGORY_ACCENT[category])} />
                  {status} · {columnTasks.length}
                </p>
              )}
              <BoardColumn id={columnDroppableId(swimlaneKey, status)}>
                <StaggerContainer className="space-y-2">
                  {columnTasks.map(renderCard)}
                </StaggerContainer>
              </BoardColumn>
            </div>
          )
        })}
      </div>
    )
  }

  const swimlanes = groupIntoSwimlanes(tasks, swimlaneBy)

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      {swimlaneBy === 'none' ? (
        renderColumns('all', tasks, true)
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <p className="text-xs text-muted-foreground">
              {tasks.length} {tasks.length === 1 ? 'issue' : 'issues'} in {swimlanes.length}{' '}
              {swimlanes.length === 1 ? 'group' : 'groups'}
            </p>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              onClick={() =>
                setCollapsed(
                  collapsed.size > 0 ? new Set() : new Set(swimlanes.map((lane) => lane.key)),
                )
              }
            >
              {collapsed.size > 0 ? (
                <ChevronsUpDown className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <ChevronsDownUp className="h-3.5 w-3.5" aria-hidden />
              )}
              {collapsed.size > 0 ? 'Expand all' : 'Collapse all'}
            </button>
          </div>

          {/* Shared column headers (lg+), aligned with the columns of every lane below. */}
          <div
            className={cn(
              gridClass,
              'hidden rounded-xl border bg-card px-3 py-2.5 shadow-soft lg:grid',
            )}
            style={gridStyle}
          >
            {workflow.statuses.map(({ name, category, wipLimit }) => (
              <div key={name} className="min-w-0">
                {renderColumnHeader(name, category, wipLimit)}
              </div>
            ))}
          </div>

          {swimlanes.map((lane) => {
            const open = !collapsed.has(lane.key)
            const isMine = !!user && lane.key === user.id
            const isUnassigned = lane.key === 'unassigned'
            const done = lane.tasks.filter((t) => t.statusCategory === 'Done').length
            const percent = lane.tasks.length ? Math.round((done / lane.tasks.length) * 100) : 0
            return (
              <section
                key={lane.key}
                className={cn(
                  'overflow-hidden rounded-xl border bg-card shadow-soft',
                  isUnassigned && 'border-dashed border-amber-400/70 dark:border-amber-500/40',
                )}
              >
                <h3 className="text-sm font-semibold">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => toggleLane(lane.key)}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors',
                      'hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                      open && 'border-b',
                      isUnassigned && 'bg-amber-50/70 dark:bg-amber-500/[0.06]',
                    )}
                  >
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                        !open && '-rotate-90',
                      )}
                      aria-hidden
                    />
                    {swimlaneBy === 'assignee' &&
                      (lane.assigneeName ? (
                        <Avatar name={lane.assigneeName} size="sm" />
                      ) : (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                          <UserX className="h-3.5 w-3.5" aria-hidden />
                        </span>
                      ))}
                    <span className="truncate">{lane.label}</span>
                    {isMine && (
                      <span className="text-xs font-normal text-muted-foreground">(you)</span>
                    )}
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {lane.tasks.length}
                    </span>
                    {isUnassigned && (
                      <span className="hidden text-xs font-normal text-amber-700 dark:text-amber-400 sm:inline">
                        Needs an owner
                      </span>
                    )}
                    <span className="ml-auto hidden items-center gap-2 text-xs font-normal text-muted-foreground sm:flex">
                      {done}/{lane.tasks.length} done
                      <span
                        className="h-1.5 w-20 overflow-hidden rounded-full bg-muted"
                        aria-hidden
                      >
                        <span
                          className="block h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </span>
                    </span>
                  </button>
                </h3>
                {open && <div className="p-3">{renderColumns(lane.key, lane.tasks, false)}</div>}
              </section>
            )
          })}
        </div>
      )}
    </DndContext>
  )
}
