import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartCard } from '@/components/dashboard/ChartCard'
import { useWorkLogCorrelation } from '@/hooks/queries/useWorkLogs'
import { CHART_COLORS } from '@/lib/constants'
import { toApiError } from '@/lib/error'
import type { WorkLogCorrelationEntry } from '@/types/worklog.types'

export interface WorkTimeCorrelationChartProps {
  projectId: string
}

function CorrelationTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: WorkLogCorrelationEntry }>
}) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  return (
    <div className="rounded-md border bg-popover p-2 text-xs shadow-md">
      <p className="font-medium">{point.issueKey ?? point.title}</p>
      <p>{point.storyPoints} story points</p>
      <p>{point.loggedHours}h logged</p>
    </div>
  )
}

/** Module 3's story-point-to-time correlation (BRD gap-closure) - every story-pointed issue with
 * at least one logged hour, scattered points-vs-actual-hours, mirroring CycleTimeChart's own
 * Scatter idiom (no new Recharts pattern). */
export function WorkTimeCorrelationChart({ projectId }: WorkTimeCorrelationChartProps) {
  const { data, isLoading, isError, error, refetch } = useWorkLogCorrelation(projectId)

  return (
    <ChartCard
      title="Story Points vs. Time Spent"
      description="Every story-pointed issue with logged hours"
      isLoading={isLoading}
      isError={isError}
      errorMessage={isError ? toApiError(error).message : undefined}
      onRetry={() => void refetch()}
      isEmpty={!data || data.entries.length === 0}
      emptyMessage="No story-pointed issues with logged hours yet."
    >
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="storyPoints"
            name="Story points"
            type="number"
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            dataKey="loggedHours"
            name="Hours logged"
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CorrelationTooltip />} />
          <Scatter data={data?.entries} fill={CHART_COLORS.single} />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
