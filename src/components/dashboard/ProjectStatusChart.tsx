import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ChartCard } from './ChartCard'
import { useProjectsByStatus } from '@/hooks/queries/useDashboard'
import { CHART_COLORS } from '@/lib/constants'
import { toApiError } from '@/lib/error'
import type { DashboardScopeQuery } from '@/types/dashboard.types'

export function ProjectStatusChart({ scope }: { scope: DashboardScopeQuery }) {
  const { data, isLoading, isError, error, refetch } = useProjectsByStatus(scope)
  const total = data?.reduce((sum, d) => sum + d.count, 0) ?? 0

  return (
    <ChartCard
      title="Projects by status"
      isLoading={isLoading}
      isError={isError}
      errorMessage={isError ? toApiError(error).message : undefined}
      onRetry={() => void refetch()}
      isEmpty={total === 0}
      emptyMessage="No projects yet."
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="status"
            innerRadius={0}
            outerRadius="80%"
            paddingAngle={2}
          >
            {data?.map((entry) => (
              <Cell
                key={entry.status}
                fill={CHART_COLORS.projectStatus[entry.status]}
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
