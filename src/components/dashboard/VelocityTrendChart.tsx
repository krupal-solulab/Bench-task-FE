import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartCard } from './ChartCard'
import { useVelocityTrend } from '@/hooks/queries/useDashboard'
import { CHART_COLORS } from '@/lib/constants'
import { toApiError } from '@/lib/error'
import type { DashboardScopeQuery } from '@/types/dashboard.types'

/** Org/project-wide velocity (Search/Dashboards v2) - story points (or issue count, when no week
 * in range used points) completed per rolling 7-day window, last 8 windows. Mirrors
 * SprintVelocityChart's same hasStoryPoints fallback, but week-bucketed across accessible
 * projects rather than per-sprint within one project. */
export function VelocityTrendChart({ scope }: { scope: DashboardScopeQuery }) {
  const { data, isLoading, isError, error, refetch } = useVelocityTrend(scope)
  const dataKey = data?.hasStoryPoints ? 'completedPoints' : 'completedCount'
  const isEmpty = !data?.points.some((p) => p.completedPoints > 0 || p.completedCount > 0)

  return (
    <ChartCard
      title="Velocity trend"
      description={
        data?.hasStoryPoints
          ? 'Story points completed per week, last 8 weeks'
          : 'Issues completed per week, last 8 weeks'
      }
      isLoading={isLoading}
      isError={isError}
      errorMessage={isError ? toApiError(error).message : undefined}
      onRetry={() => void refetch()}
      isEmpty={isEmpty}
      emptyMessage="No completed work in this period."
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data?.points} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <XAxis
            dataKey="weekStart"
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: string) => v.slice(5)}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: 'transparent' }} />
          <Bar
            dataKey={dataKey}
            name={data?.hasStoryPoints ? 'Points completed' : 'Issues completed'}
            fill={CHART_COLORS.velocityTrend}
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
