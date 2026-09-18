import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartCard } from '@/components/dashboard/ChartCard'
import { useSprintVelocity } from '@/hooks/queries/useSprints'
import { CHART_COLORS } from '@/lib/constants'
import { toApiError } from '@/lib/error'

export interface SprintVelocityChartProps {
  projectId: string
  limit?: number
}

/** BRD Velocity report: story points (or issue count, when no sprint in range used points)
 * completed per sprint, for the last N completed sprints. */
export function SprintVelocityChart({ projectId, limit = 5 }: SprintVelocityChartProps) {
  const { data, isLoading, isError, error, refetch } = useSprintVelocity(projectId, limit)
  const usesPoints = !!data?.some((d) => d.completedPoints > 0)
  const dataKey = usesPoints ? 'completedPoints' : 'completedCount'

  return (
    <ChartCard
      title="Velocity"
      description={
        usesPoints
          ? `Story points completed per sprint, last ${limit} sprints`
          : `Issues completed per sprint, last ${limit} sprints`
      }
      isLoading={isLoading}
      isError={isError}
      errorMessage={isError ? toApiError(error).message : undefined}
      onRetry={() => void refetch()}
      isEmpty={!data || data.length === 0}
      emptyMessage="No completed sprints yet."
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: 'transparent' }} />
          <Bar
            dataKey={dataKey}
            name={usesPoints ? 'Points completed' : 'Issues completed'}
            fill={CHART_COLORS.single}
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
