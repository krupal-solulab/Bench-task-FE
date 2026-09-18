import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartCard } from './ChartCard'
import { useSlaCompliance } from '@/hooks/queries/useDashboard'
import { CHART_COLORS } from '@/lib/constants'
import { toApiError } from '@/lib/error'
import type { DashboardScopeQuery } from '@/types/dashboard.types'

export function SlaComplianceChart({ scope }: { scope: DashboardScopeQuery }) {
  const { data, isLoading, isError, error, refetch } = useSlaCompliance(scope)
  const total = data?.reduce((sum, d) => sum + d.total, 0) ?? 0

  return (
    <ChartCard
      title="SLA compliance"
      description="Compliant vs. breached, last 90 days"
      isLoading={isLoading}
      isError={isError}
      errorMessage={isError ? toApiError(error).message : undefined}
      onRetry={() => void refetch()}
      isEmpty={total === 0}
      emptyMessage="No tasks in this period."
    >
      <div className="flex h-full flex-col gap-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
            <XAxis dataKey="priority" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip cursor={{ fill: 'transparent' }} />
            <Legend />
            <Bar
              dataKey="compliant"
              name="Compliant"
              fill={CHART_COLORS.sla.compliant}
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
            <Bar
              dataKey="breached"
              name="Breached"
              fill={CHART_COLORS.sla.breached}
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
        <dl className="flex shrink-0 justify-around text-xs text-muted-foreground">
          {data?.map((entry) => (
            <div key={entry.priority} className="text-center">
              <dt>{entry.priority} avg</dt>
              <dd className="font-medium text-foreground">
                {entry.avgResolutionHours != null ? `${entry.avgResolutionHours}h` : '—'}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </ChartCard>
  )
}
