import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartCard } from '@/components/dashboard/ChartCard'
import { useEpicProgressReport } from '@/hooks/queries/useProjects'
import { buildEpicRoadmapData } from '@/lib/epic-roadmap'
import { CHART_COLORS } from '@/lib/constants'
import { toApiError } from '@/lib/error'

export interface EpicRoadmapTimelineProps {
  projectId: string
}

/** BRD 6.4's Epic-level roadmap/timeline: "a simple Gantt-style bar per epic across a date axis."
 * Built with Recharts (the house charting library) using the standard stacked-bar Gantt trick -
 * an invisible offset bar, then a visible duration bar. Epics without a dueDate are excluded
 * (there's no target to plot), with a hint explaining why. */
export function EpicRoadmapTimeline({ projectId }: EpicRoadmapTimelineProps) {
  const { data, isLoading, isError, error, refetch } = useEpicProgressReport(projectId)
  const roadmap = data ? buildEpicRoadmapData(data) : null

  return (
    <ChartCard
      title="Epic roadmap"
      description="Each epic's span from creation to its target date"
      isLoading={isLoading}
      isError={isError}
      errorMessage={isError ? toApiError(error).message : undefined}
      onRetry={() => void refetch()}
      isEmpty={!roadmap}
      emptyMessage="No epics with a target date yet - set one on an epic to see it here."
    >
      {roadmap && (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={roadmap.rows}
            layout="vertical"
            margin={{ top: 8, right: 16, bottom: 0, left: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, roadmap.totalDays]}
              tickFormatter={(v: number) => `day ${v}`}
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="title"
              width={120}
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'transparent' }}
              formatter={(value: number, name: string) =>
                name === 'durationDays' ? [`${value} day(s)`, 'Duration'] : [value, name]
              }
            />
            <Bar
              dataKey="offsetDays"
              stackId="roadmap"
              fill="transparent"
              isAnimationActive={false}
            />
            <Bar
              dataKey="durationDays"
              stackId="roadmap"
              fill={CHART_COLORS.single}
              radius={[4, 4, 4, 4]}
              maxBarSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}
