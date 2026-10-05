import { AlertTriangle } from 'lucide-react'
import { useTaskRisk } from '@/hooks/queries/useTasks'
import { cn } from '@/lib/cn'

/** Module 10 gap-closure - "At risk" flag on an issue, with the reasons on hover. Renders
 * nothing when the issue isn't at risk, so it's invisible for healthy work. */
export function RiskBadge({ taskId }: { taskId: string }) {
  const { data: risk } = useTaskRisk(taskId)
  if (!risk || risk.score === 0) return null

  const high = risk.level === 'high'
  return (
    <span
      title={risk.reasons.join('\n')}
      aria-label={`At risk: ${risk.reasons.join('; ')}`}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        high
          ? 'bg-destructive/10 text-destructive'
          : 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
      )}
    >
      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
      {high ? 'High risk' : 'At risk'}
    </span>
  )
}

/** The reasons as a short list - shown under the badge on the issue page. */
export function RiskReasons({ taskId }: { taskId: string }) {
  const { data: risk } = useTaskRisk(taskId)
  if (!risk || risk.reasons.length === 0) return null
  return (
    <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
      {risk.reasons.map((reason) => (
        <li key={reason}>• {reason}</li>
      ))}
    </ul>
  )
}
