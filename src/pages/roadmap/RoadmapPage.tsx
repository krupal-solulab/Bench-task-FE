import { useState } from 'react'
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
import { useUpdateTask } from '@/hooks/mutations/useTaskMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import { buildRoadmapChartData, colorForProject } from '@/lib/roadmap'
import { STATUS_CATEGORIES } from '@/types/workflow.types'
import type { RoadmapEpic } from '@/types/issue-link.types'

const ALL = '__all__'

interface EpicRowProps {
  epic: RoadmapEpic
}

/** Its own component (not a loop body) so it can own its own `useUpdateTask` mutation instance -
 * the click-to-edit due date stands in for the BRD's "drag to reschedule" interaction (no Gantt-
 * drag library is installed in this codebase; this achieves the same outcome). */
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

  const { data: projectsData } = useProjects({
    page: 1,
    limit: 100,
    sortBy: 'name',
    sortOrder: 'asc',
  })
  const { data, isLoading, isError, error, refetch } = useRoadmap({
    projectIds: projectId === ALL ? undefined : [projectId],
    status: status === ALL ? undefined : (status as (typeof STATUS_CATEGORIES)[number]),
  })

  const chartData = data ? buildRoadmapChartData(data.epics) : null
  const projectIds = (data?.projects ?? []).map((p) => p.id)
  const projectNameById = new Map((data?.projects ?? []).map((p) => [p.id, p.name]))

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
          {data.capacity.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.capacity.map((c) => (
                <div key={c.projectId} className="rounded-lg border bg-card p-4">
                  <p className="font-medium">{projectNameById.get(c.projectId) ?? c.projectId}</p>
                  {c.activeSprintId ? (
                    <p className="text-sm text-muted-foreground">
                      {c.committedPoints} / {c.capacityPoints ?? '—'} points committed
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No active sprint</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {chartData && (
            <div className="h-80 rounded-xl border bg-card p-4 shadow-soft">
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
                    tickFormatter={(v: number) => `day ${v}`}
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
                  >
                    {chartData.rows.map((row) => (
                      <Cell key={row.epicId} fill={colorForProject(row.projectId, projectIds)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
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
