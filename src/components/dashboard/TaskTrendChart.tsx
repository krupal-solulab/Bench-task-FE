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
import { useTaskTrend } from '@/hooks/queries/useDashboard'
import { CHART_COLORS } from '@/lib/constants'
import { toApiError } from '@/lib/error'
import type { DashboardScopeQuery } from '@/types/dashboard.types'

export function TaskTrendChart({ scope }: { scope: DashboardScopeQuery }) {
  const { data, isLoading, isError, error, refetch } = useTaskTrend({ ...scope, days: 30 })
  const hasAnyActivity = !!data?.some((d) => d.created > 0 || d.completed > 0)

  return (
    <ChartCard
      title="Task trend"
      description="Created vs. completed, last 30 days"
      isLoading={isLoading}
      isError={isError}
      errorMessage={isError ? toApiError(error).message : undefined}
      onRetry={() => void refetch()}
      isEmpty={!hasAnyActivity}
      emptyMessage="No task activity in this period."
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
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
          <Line
            type="monotone"
            dataKey="created"
            name="Created"
            stroke={CHART_COLORS.trend.created}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="completed"
            name="Completed"
            stroke={CHART_COLORS.trend.completed}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
