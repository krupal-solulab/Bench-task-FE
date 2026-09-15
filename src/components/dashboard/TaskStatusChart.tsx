import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ChartCard } from './ChartCard'
import { useTasksStatus } from '@/hooks/queries/useDashboard'
import { CHART_COLORS } from '@/lib/constants'
import { toApiError } from '@/lib/error'
import type { DashboardScopeQuery } from '@/types/dashboard.types'
import type { StatusCategory } from '@/types/workflow.types'

const KNOWN_STATUS_COLORS: Record<string, string> = CHART_COLORS.taskStatus
// Fallback fill for a status name the fixed palette above doesn't recognize (a custom workflow's
// status) - colored by category instead of leaving the slice an undefined/default recharts color.
const CATEGORY_FILL: Record<StatusCategory, string> = {
  'To Do': '#64748b',
  'In Progress': '#3b82f6',
  Done: '#10b981',
}

export function TaskStatusChart({ scope }: { scope: DashboardScopeQuery }) {
  const { data, isLoading, isError, error, refetch } = useTasksStatus(scope)
  const total = data?.reduce((sum, d) => sum + d.count, 0) ?? 0

  return (
    <ChartCard
      title="Task status"
      description="Open vs. completed"
      isLoading={isLoading}
      isError={isError}
      errorMessage={isError ? toApiError(error).message : undefined}
      onRetry={() => void refetch()}
      isEmpty={total === 0}
      emptyMessage="No tasks yet."
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="status"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
          >
            {data?.map((entry) => (
              <Cell
                key={entry.status}
                fill={
                  KNOWN_STATUS_COLORS[entry.status] ??
                  (entry.category ? CATEGORY_FILL[entry.category] : CHART_COLORS.single)
                }
                stroke="var(--background, #fff)"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
