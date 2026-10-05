import { Link } from 'react-router-dom'
import { ChartCard } from '@/components/dashboard/ChartCard'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { useAtRiskIssues } from '@/hooks/queries/useTasks'
import { formatDate } from '@/lib/date'
import { toApiError } from '@/lib/error'
import { cn } from '@/lib/cn'

/** Module 10 gap-closure - a project's open issues flagged at risk, riskiest first, each with the
 * plain-language reasons (overdue, not started, stalled, blocked, unassigned P1). */
export function AtRiskIssuesCard({ projectId }: { projectId: string }) {
  const { data, isLoading, isError, error, refetch } = useAtRiskIssues(projectId)

  return (
    <ChartCard
      title="Issues at risk"
      description="Overdue, not started near the due date, stalled, blocked, or unassigned P1"
      isLoading={isLoading}
      isError={isError}
      errorMessage={isError ? toApiError(error).message : undefined}
      onRetry={() => void refetch()}
      isEmpty={!data || data.length === 0}
      emptyMessage="Nothing at risk right now."
    >
      <ul className="h-full space-y-2 overflow-y-auto pr-1">
        {(data ?? []).map((issue) => (
          <li key={issue.id} className="rounded-md border p-2 text-sm">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'h-2 w-2 shrink-0 rounded-full',
                  issue.risk.level === 'high' ? 'bg-destructive' : 'bg-amber-500',
                )}
                aria-label={issue.risk.level === 'high' ? 'High risk' : 'At risk'}
              />
              <Link to={`/tasks/${issue.id}`} className="truncate font-medium hover:underline">
                {issue.issueKey ? `${issue.issueKey} ` : ''}
                {issue.title}
              </Link>
              <PriorityBadge priority={issue.priority} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {issue.risk.reasons.join(' · ')}
              {issue.dueDate ? ` · due ${formatDate(issue.dueDate)}` : ''}
            </p>
          </li>
        ))}
      </ul>
    </ChartCard>
  )
}
