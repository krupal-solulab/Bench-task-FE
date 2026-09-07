import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartCard } from './ChartCard'
import { useTasksByPriority } from '@/hooks/queries/useDashboard'
import { CHART_COLORS } from '@/lib/constants'
import { toApiError } from '@/lib/error'
import type { DashboardScopeQuery } from '@/types/dashboard.types'

export function TaskPriorityChart({ scope }: { scope: DashboardScopeQuery }) {
  const { data, isLoading, isError, error, refetch } = useTasksByPriority(scope)
  const total = data?.reduce((sum, d) => sum + d.count, 0) ?? 0

  return (
    <ChartCard
      title="Tasks by priority"
      isLoading={isLoading}
      isError={isError}
      errorMessage={isError ? toApiError(error).message : undefined}
      onRetry={() => void refetch()}
      isEmpty={total === 0}
      emptyMessage="No tasks yet."
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <XAxis dataKey="priority" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: 'transparent' }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {data?.map((entry) => (
              <Cell key={entry.priority} fill={CHART_COLORS.priority[entry.priority]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
