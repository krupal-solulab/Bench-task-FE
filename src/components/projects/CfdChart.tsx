import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartCard } from '@/components/dashboard/ChartCard'
import { useCfdReport } from '@/hooks/queries/useProjects'
import { CHART_COLORS } from '@/lib/constants'
import { toApiError } from '@/lib/error'

export interface CfdChartProps {
  projectId: string
}

/** Module 9's Cumulative Flow Diagram: a stacked area chart of task counts per status category,
 * per day, over the last 30 days - shows both overall throughput and where work is piling up. */
export function CfdChart({ projectId }: CfdChartProps) {
  const { data, isLoading, isError, error, refetch } = useCfdReport(projectId, 30)
  const isEmpty = !data || data.every((point) => point.toDo + point.inProgress + point.done === 0)

  return (
    <ChartCard
      title="Cumulative Flow Diagram"
      description="Task counts by status category, per day"
      isLoading={isLoading}
      isError={isError}
      errorMessage={isError ? toApiError(error).message : undefined}
      onRetry={() => void refetch()}
      isEmpty={isEmpty}
      emptyMessage="No tasks yet."
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: string) => v.slice(5)}
            minTickGap={24}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip />
          <Legend />
          <Area
            type="monotone"
            dataKey="toDo"
            name="To Do"
            stackId="cfd"
            stroke={CHART_COLORS.cfd.toDo}
            fill={CHART_COLORS.cfd.toDo}
            fillOpacity={0.7}
          />
          <Area
            type="monotone"
            dataKey="inProgress"
            name="In Progress"
            stackId="cfd"
            stroke={CHART_COLORS.cfd.inProgress}
            fill={CHART_COLORS.cfd.inProgress}
            fillOpacity={0.7}
          />
          <Area
            type="monotone"
            dataKey="done"
            name="Done"
            stackId="cfd"
            stroke={CHART_COLORS.cfd.done}
            fill={CHART_COLORS.cfd.done}
            fillOpacity={0.7}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
