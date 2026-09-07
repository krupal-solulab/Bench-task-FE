import { useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChartCard } from './ChartCard'
import { useDeveloperWorkload } from '@/hooks/queries/useDashboard'
import { CHART_COLORS } from '@/lib/constants'
import { toApiError } from '@/lib/error'
import type { DashboardScopeQuery, WorkloadSortBy } from '@/types/dashboard.types'

const SORT_OPTIONS: { value: WorkloadSortBy; label: string }[] = [
  { value: 'workload', label: 'Workload' },
  { value: 'completionRate', label: 'Completion rate' },
  { value: 'name', label: 'Name' },
]

export function DeveloperWorkloadChart({ scope }: { scope: DashboardScopeQuery }) {
  const [sortBy, setSortBy] = useState<WorkloadSortBy>('workload')
  const { data, isLoading, isError, error, refetch } = useDeveloperWorkload({ ...scope, sortBy })

  return (
    <ChartCard
      title="Developer workload"
      description="Total assigned and completion rate"
      isLoading={isLoading}
      isError={isError}
      errorMessage={isError ? toApiError(error).message : undefined}
      onRetry={() => void refetch()}
      isEmpty={!data || data.length === 0}
      emptyMessage="No assigned tasks yet."
      actions={
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as WorkloadSortBy)}>
          <SelectTrigger className="h-8 w-36 text-xs" aria-label="Sort developer workload">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip cursor={{ fill: 'transparent' }} />
          <Bar
            dataKey="totalAssigned"
            name="Assigned"
            fill={CHART_COLORS.single}
            radius={[0, 4, 4, 0]}
            maxBarSize={24}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
