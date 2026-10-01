import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartCard } from '@/components/dashboard/ChartCard'
import { useCycleTimeReport } from '@/hooks/queries/useProjects'
import { CHART_COLORS } from '@/lib/constants'
import { formatDate } from '@/lib/date'
import { toApiError } from '@/lib/error'
import { rollingStats, rollingWindowFor } from '@/lib/rolling-stats'
import type { CycleTimePoint } from '@/types/project.types'

interface RollingFields {
  rollingMean: number
  /** [low, high] - a recharts range area renders this as the band. */
  rollingBand: [number, number]
}

export interface CycleTimeChartProps {
  projectId: string
}

function CycleTimeTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: CycleTimePoint & Partial<RollingFields> }>
}) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  return (
    <div className="rounded-md border bg-popover p-2 text-xs shadow-md">
      <p className="font-medium">{point.issueKey ?? point.title}</p>
      <p className="text-muted-foreground">Completed {formatDate(point.completedAt)}</p>
      <p>Cycle time: {point.cycleTimeHours}h</p>
      <p>Lead time: {point.leadTimeHours}h</p>
      {point.rollingMean != null && (
        <p className="text-muted-foreground">Rolling average: {point.rollingMean}h</p>
      )}
    </div>
  )
}

/** Module 9's Control Chart: cycle time per completed issue, scattered by completion date, with a
 * reference line for the average - shows both typical cycle time and outliers, over the last 90
 * days. */
export function CycleTimeChart({ projectId }: CycleTimeChartProps) {
  const { data, isLoading, isError, error, refetch } = useCycleTimeReport(projectId, 90)
  // Module 9 gap-closure: a rolling average (+/-1 standard deviation band) over the points in
  // completion order - "typical cycle time right now" and its normal spread.
  const sorted = [...(data?.points ?? [])].sort((a, b) =>
    a.completedAt.localeCompare(b.completedAt),
  )
  const rolling = rollingStats(
    sorted.map((p) => p.cycleTimeHours),
    rollingWindowFor(sorted.length),
  )
  const chartData = sorted.map((point, i) => ({
    ...point,
    rollingMean: rolling[i]!.mean,
    rollingBand: [rolling[i]!.low, rolling[i]!.high] as [number, number],
  }))

  return (
    <ChartCard
      title="Control Chart"
      description="Cycle time per completed issue, last 90 days, with a rolling average band"
      isLoading={isLoading}
      isError={isError}
      errorMessage={isError ? toApiError(error).message : undefined}
      onRetry={() => void refetch()}
      isEmpty={!data || data.points.length === 0}
      emptyMessage="No issues completed in this period."
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="completedAt"
            type="category"
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: string) => v.slice(5, 10)}
            minTickGap={24}
            allowDuplicatedCategory={false}
          />
          <YAxis
            dataKey="cycleTimeHours"
            name="Cycle time (h)"
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CycleTimeTooltip />} />
          {data?.averageCycleTimeHours != null && (
            <ReferenceLine
              y={data.averageCycleTimeHours}
              stroke={CHART_COLORS.cycleTime.average}
              strokeDasharray="5 5"
              label={{ value: 'Average', position: 'insideTopRight', fontSize: 11 }}
            />
          )}
          <Area
            dataKey="rollingBand"
            name="Rolling range"
            stroke="none"
            fill={CHART_COLORS.cycleTime.rolling}
            fillOpacity={0.15}
            isAnimationActive={false}
            activeDot={false}
          />
          <Line
            dataKey="rollingMean"
            name="Rolling average"
            stroke={CHART_COLORS.cycleTime.rolling}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Scatter dataKey="cycleTimeHours" fill={CHART_COLORS.cycleTime.point} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
