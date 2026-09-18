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
import { ChartCard } from '@/components/dashboard/ChartCard'
import { useSprintBurndown } from '@/hooks/queries/useSprints'
import { CHART_COLORS } from '@/lib/constants'
import { toApiError } from '@/lib/error'

export interface SprintBurndownChartProps {
  projectId: string
  sprintId: string | undefined
}

/** BRD Burndown chart: remaining work per day vs. an ideal trend line, for the selected sprint.
 * A sprint that hasn't started yet (or none selected) has nothing to plot. */
export function SprintBurndownChart({ projectId, sprintId }: SprintBurndownChartProps) {
  const { data, isLoading, isError, error, refetch } = useSprintBurndown(projectId, sprintId)
  const usesPoints = !!data?.hasStoryPoints
  const remainingKey = usesPoints ? 'remainingPoints' : 'remainingCount'
  const idealKey = usesPoints ? 'idealRemainingPoints' : 'idealRemainingCount'

  return (
    <ChartCard
      title="Burndown"
      description={usesPoints ? 'Remaining story points vs. ideal' : 'Remaining issues vs. ideal'}
      isLoading={isLoading}
      isError={isError}
      errorMessage={isError ? toApiError(error).message : undefined}
      onRetry={() => void refetch()}
      isEmpty={!sprintId || !data || data.points.length === 0}
      emptyMessage={
        sprintId ? "This sprint hasn't started yet." : 'Select a sprint to view its burndown.'
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data?.points} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
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
            dataKey={idealKey}
            name="Ideal"
            stroke={CHART_COLORS.burndown.ideal}
            strokeDasharray="5 5"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey={remainingKey}
            name="Actual"
            stroke={CHART_COLORS.burndown.actual}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
