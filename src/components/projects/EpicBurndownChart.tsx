import { useEffect, useState } from 'react'
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
import { FormField } from '@/components/common/FormField'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useEpicProgressReport } from '@/hooks/queries/useProjects'
import { useEpicBurndown } from '@/hooks/queries/useTasks'
import { CHART_COLORS } from '@/lib/constants'
import { toApiError } from '@/lib/error'

export interface EpicBurndownChartProps {
  projectId: string
}

/** Module 9's Epic Burndown: remaining linked-issue work over time for a chosen Epic - mirrors
 * SprintBurndownChart's shape, but self-contained (owns its own epic picker) since, unlike a
 * sprint, there's no other Reports-tab control already selecting "which epic". */
export function EpicBurndownChart({ projectId }: EpicBurndownChartProps) {
  const { data: epics } = useEpicProgressReport(projectId)
  const [epicId, setEpicId] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!epicId && epics?.[0]) setEpicId(epics[0].epicId)
  }, [epics, epicId])

  const { data, isLoading, isError, error, refetch } = useEpicBurndown(epicId)
  const usesPoints = !!data?.hasStoryPoints
  const remainingKey = usesPoints ? 'remainingPoints' : 'remainingCount'
  const idealKey = usesPoints ? 'idealRemainingPoints' : 'idealRemainingCount'

  return (
    <div className="space-y-3">
      <FormField label="Epic burndown for" htmlFor="epic-burndown-select">
        <Select
          value={epicId ?? ''}
          onValueChange={setEpicId}
          disabled={!epics || epics.length === 0}
        >
          <SelectTrigger id="epic-burndown-select" className="w-64">
            <SelectValue placeholder="No epics yet" />
          </SelectTrigger>
          <SelectContent>
            {(epics ?? []).map((epic) => (
              <SelectItem key={epic.epicId} value={epic.epicId}>
                {epic.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <ChartCard
        title="Epic Burndown"
        description={
          usesPoints ? 'Remaining story points vs. ideal' : 'Remaining linked issues vs. ideal'
        }
        isLoading={isLoading}
        isError={isError}
        errorMessage={isError ? toApiError(error).message : undefined}
        onRetry={() => void refetch()}
        isEmpty={!epicId || !data || data.points.length === 0}
        emptyMessage={epicId ? 'This epic has no linked issues yet.' : 'Select an epic.'}
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
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip />
            <Legend />
            {data?.hasIdealLine && (
              <Line
                type="monotone"
                dataKey={idealKey}
                name="Ideal"
                stroke={CHART_COLORS.burndown.ideal}
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
              />
            )}
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
    </div>
  )
}
