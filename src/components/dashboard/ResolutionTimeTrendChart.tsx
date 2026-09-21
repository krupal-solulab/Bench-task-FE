import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartCard } from './ChartCard'
import { useResolutionTimeTrend } from '@/hooks/queries/useDashboard'
import { CHART_COLORS } from '@/lib/constants'
import { toApiError } from '@/lib/error'
import { TASK_PRIORITIES } from '@/types/task.types'
import type { DashboardScopeQuery } from '@/types/dashboard.types'

/** BRD 7's resolution-time-trend widget: average hours-to-resolve per priority, one line per
 * priority, over the last 8 weeks - mirrors TaskTrendChart.tsx's own multi-series LineChart. */
export function ResolutionTimeTrendChart({ scope }: { scope: DashboardScopeQuery }) {
  const { data, isLoading, isError, error, refetch } = useResolutionTimeTrend(scope)
  const chartData = data?.map((point) => ({
    weekStart: point.weekStart,
    ...point.avgResolutionHoursByPriority,
  }))
  const hasAnyData = !!data?.some((point) =>
    Object.values(point.avgResolutionHoursByPriority).some((v) => v != null),
  )

  return (
    <ChartCard
      title="Resolution time trend"
      description="Avg. hours to resolve per priority, last 8 weeks"
      isLoading={isLoading}
      isError={isError}
      errorMessage={isError ? toApiError(error).message : undefined}
      onRetry={() => void refetch()}
      isEmpty={!hasAnyData}
      emptyMessage="No tasks resolved in this period."
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
          <XAxis
            dataKey="weekStart"
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: string) => v.slice(5)}
            minTickGap={24}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip />
          <Legend />
          {TASK_PRIORITIES.map((priority) => (
            <Line
              key={priority}
              type="monotone"
              dataKey={priority}
              name={priority}
              stroke={CHART_COLORS.priority[priority]}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
