import { useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type BarProps,
} from 'recharts'
import { PageHeader } from '@/components/layout/PageHeader'
import { CardSkeleton } from '@/components/common/Skeleton'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { DatePicker } from '@/components/common/DatePicker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProjects } from '@/hooks/queries/useProjects'
import { useRoadmap } from '@/hooks/queries/useRoadmap'
import { useTeams } from '@/hooks/queries/useTeams'
import { useUpdateAnyTask, useUpdateTask } from '@/hooks/mutations/useTaskMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import {
  buildRoadmapChartData,
  buildRoadmapTicks,
  colorForProject,
  computeRescheduledDate,
  formatRoadmapTick,
  type RoadmapChartRow,
  type RoadmapGranularity,
} from '@/lib/roadmap'
import { STATUS_CATEGORIES } from '@/types/workflow.types'
import type { RoadmapEpic } from '@/types/issue-link.types'

const ALL = '__all__'

interface DraggableEpicBarProps extends BarProps {
  // Recharts attaches each bar's original data row here at runtime, but doesn't declare it on
  // the public `BarProps` type - it's typed loosely here and narrowed via RoadmapChartRow below.
  payload?: unknown
  epicByEpicId: Map<string, RoadmapEpic>
  onReschedule: (epicId: string, newDueDate: string) => void
}

/** The BRD's "drag to reschedule" interaction, as a real horizontal mouse-drag on the Gantt bar
 * itself - additive to (not a replacement for) each row's existing click-to-edit DatePicker below,
 * so a rough edge here never takes away a working way to reschedule an epic. Deliberately doesn't
 * try to live-preview the bar moving mid-drag (that needs deeper Recharts internals than a custom
 * `shape` renderer exposes cleanly) - it tracks the drag, and on release commits the new due date
 * through the exact same update mutation the DatePicker uses, so the bar moves the normal way once
 * the mutation resolves and the roadmap refetches. */
function DraggableEpicBar(props: DraggableEpicBarProps) {
  const { x = 0, y = 0, width = 0, height = 0, fill, payload, epicByEpicId, onReschedule } = props
  const row = payload as RoadmapChartRow | undefined
  const epic = row ? epicByEpicId.get(row.epicId) : undefined
  const canDrag = !!epic?.dueDate
  const dragState = useRef<{ startClientX: number; pixelsPerDay: number } | null>(null)

  function handleMouseDown(event: ReactMouseEvent<SVGRectElement>) {
    if (!canDrag || !epic?.dueDate || !row) return
    event.preventDefault()
    const pixelsPerDay = Number(width) / Math.max(1, row.durationDays)
    dragState.current = { startClientX: event.clientX, pixelsPerDay }

    function handleMouseUp(upEvent: MouseEvent) {
      const drag = dragState.current
      dragState.current = null
      window.removeEventListener('mouseup', handleMouseUp)
      if (!drag || !epic?.dueDate) return
      const newDueDate = computeRescheduledDate(
        epic.dueDate,
        upEvent.clientX - drag.startClientX,
        drag.pixelsPerDay,
      )
      if (newDueDate) onReschedule(epic.epicId, newDueDate)
    }
    window.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={4}
      fill={fill}
      style={{ cursor: canDrag ? 'ew-resize' : 'default' }}
      onMouseDown={handleMouseDown}
      data-testid={row ? `roadmap-gantt-bar-${row.epicId}` : 'roadmap-gantt-bar'}
    />
  )
}

interface EpicRowProps {
  epic: RoadmapEpic
}

/** Its own component (not a loop body) so it can own its own `useUpdateTask` mutation instance -
 * a click-to-edit fallback alongside the Gantt chart's own drag-to-reschedule, so rescheduling
 * still works even for someone who'd rather type a date than drag a bar. */
function EpicRow({ epic }: EpicRowProps) {
  const updateTask = useUpdateTask(epic.epicId)
  const { showToast } = useToast()

  async function handleDueDateChange(dueDate: string | null) {
    try {
      await updateTask.mutateAsync({ dueDate })
    } catch (err) {
      showToast({
        title: 'Could not update due date',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link to={`/tasks/${epic.epicId}`} className="truncate font-medium hover:text-primary">
            {epic.issueKey && (
              <span className="mr-1.5 font-mono text-xs text-muted-foreground">
                {epic.issueKey}
              </span>
            )}
            {epic.title}
          </Link>
          <span className="shrink-0 text-xs text-muted-foreground">{epic.project.name}</span>
        </div>
        {epic.blockedByExternal.length > 0 && (
          <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Blocked by{' '}
            {epic.blockedByExternal.map((b, i) => (
              <span key={b.epicId}>
                <Link to={`/tasks/${b.epicId}`} className="underline hover:text-amber-900">
                  {b.issueKey ?? b.title}
                </Link>{' '}
                ({b.projectName}){i < epic.blockedByExternal.length - 1 ? ',' : ''}
              </span>
            ))}
          </p>
        )}
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">{epic.progress}% done</span>
      <DatePicker
        label={`${epic.issueKey ?? epic.title} due date`}
        value={epic.dueDate}
        onChange={(v) => void handleDueDateChange(v)}
        className="w-36 shrink-0"
      />
    </li>
  )
}

/** Module 1's org-wide cross-project Roadmap (BRD: "a single timeline across every project, with
 * capacity and blocking visibility"). Reuses the per-project Epic roadmap's Gantt-lite Recharts
 * pattern (see EpicRoadmapTimeline), extended with per-project color-coding, a capacity summary
 * per project's active sprint, and cross-project "blocked by" warnings. */
export function RoadmapPage() {
  const [projectId, setProjectId] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [teamId, setTeamId] = useState(ALL)
  const [granularity, setGranularity] = useState<RoadmapGranularity>('month')

  const { data: projectsData } = useProjects({
    page: 1,
    limit: 100,
    sortBy: 'name',
    sortOrder: 'asc',
  })
  const { data: teamsData } = useTeams()
  const { data, isLoading, isError, error, refetch } = useRoadmap({
    projectIds: projectId === ALL ? undefined : [projectId],
    status: status === ALL ? undefined : (status as (typeof STATUS_CATEGORIES)[number]),
    teamId: teamId === ALL ? undefined : teamId,
  })

  const chartData = data ? buildRoadmapChartData(data.epics) : null
  const projectIds = (data?.projects ?? []).map((p) => p.id)
  const projectNameById = new Map((data?.projects ?? []).map((p) => [p.id, p.name]))
  const epicByEpicId = new Map((data?.epics ?? []).map((e) => [e.epicId, e]))

  const updateAnyTask = useUpdateAnyTask()
  const { showToast: showRescheduleToast } = useToast()
  function handleReschedule(epicId: string, newDueDate: string) {
    updateAnyTask.mutate(
      { id: epicId, dueDate: newDueDate },
      {
        onError: (err) => {
          showRescheduleToast({
            title: 'Could not reschedule',
            description: toApiError(err).message,
            variant: 'destructive',
          })
        },
      },
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roadmap"
        description="Cross-project epic timeline, with per-project capacity and cross-project blocking warnings"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger aria-label="Filter by project" className="w-52">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All projects</SelectItem>
            {(projectsData?.data ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger aria-label="Filter by status" className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {STATUS_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={teamId} onValueChange={setTeamId}>
          <SelectTrigger aria-label="Filter by team" className="w-48">
            <SelectValue placeholder="All teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All teams</SelectItem>
            {(teamsData ?? []).map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={granularity} onValueChange={(v) => setGranularity(v as RoadmapGranularity)}>
          <SelectTrigger aria-label="Zoom level" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="month">Month</SelectItem>
            <SelectItem value="quarter">Quarter</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <CardSkeleton />
      ) : isError ? (
        <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
      ) : !data || data.epics.length === 0 ? (
        <EmptyState
          title="No epics to show"
          description="Epics with a target date across your accessible projects will appear here."
        />
      ) : (
        <>
          {chartData && (
            <div className="rounded-xl border bg-card p-4 shadow-soft">
              <p className="mb-2 text-xs text-muted-foreground">
                Drag a bar to reschedule that epic&apos;s due date.
              </p>
              {data.capacity.length > 0 && (
                <div className="mb-3 flex flex-wrap items-center gap-2 border-b pb-3">
                  {data.capacity.map((c) => (
                    <span
                      key={c.projectId}
                      title={
                        c.activeSprintId
                          ? `${c.committedPoints} / ${c.capacityPoints ?? '—'} points committed`
                          : 'No active sprint'
                      }
                      className={
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ' +
                        (c.isOverCommitted
                          ? 'border-destructive/40 bg-destructive/10 text-destructive'
                          : 'border-transparent bg-secondary text-secondary-foreground')
                      }
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: colorForProject(c.projectId, projectIds) }}
                      />
                      <span>{projectNameById.get(c.projectId) ?? c.projectId}</span>
                      {c.activeSprintId ? (
                        <span className="font-mono">
                          {c.committedPoints}/{c.capacityPoints ?? '—'}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No active sprint</span>
                      )}
                      {c.isOverCommitted && <AlertTriangle className="h-3 w-3 shrink-0" />}
                      {c.teamCapacityPoints != null && (
                        <span
                          className="text-muted-foreground"
                          title="Sum of capacityPoints across this project's assigned team(s)"
                        >
                          · team: {c.teamCapacityPoints}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              )}
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData.rows}
                    layout="vertical"
                    margin={{ top: 8, right: 16, bottom: 0, left: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, chartData.totalDays]}
                      ticks={buildRoadmapTicks(chartData.totalDays, granularity)}
                      tickFormatter={(v: number) =>
                        formatRoadmapTick(v, chartData.startDate, granularity)
                      }
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="title"
                      width={140}
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value: number, name: string, item) =>
                        name === 'durationDays'
                          ? [`${value} day(s) · ${item.payload.projectName}`, 'Duration']
                          : [value, name]
                      }
                    />
                    <Bar
                      dataKey="offsetDays"
                      stackId="roadmap"
                      fill="transparent"
                      isAnimationActive={false}
                    />
                    <Bar
                      dataKey="durationDays"
                      stackId="roadmap"
                      radius={[4, 4, 4, 4]}
                      maxBarSize={24}
                      shape={(shapeProps: BarProps) => (
                        <DraggableEpicBar
                          {...shapeProps}
                          epicByEpicId={epicByEpicId}
                          onReschedule={handleReschedule}
                        />
                      )}
                    >
                      {chartData.rows.map((row) => (
                        <Cell key={row.epicId} fill={colorForProject(row.projectId, projectIds)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <ul className="space-y-2">
            {data.epics.map((epic) => (
              <EpicRow key={epic.epicId} epic={epic} />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
