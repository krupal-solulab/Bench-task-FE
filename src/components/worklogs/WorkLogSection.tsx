import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { LogWorkForm } from './LogWorkForm'
import { WorkLogItem } from './WorkLogItem'
import { useTaskWorkLogs, useWorkLogSummary } from '@/hooks/queries/useWorkLogs'
import { useLogWork } from '@/hooks/mutations/useWorkLogMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import type { WorkLogFormValues } from '@/schemas/worklog.schema'

export interface WorkLogSectionProps {
  taskId: string
}

/** Module 3's "log hours against a task" section on the task detail page - an estimate-vs-actual
 * summary bar plus a list of work log entries, mirroring SubtaskChecklist/IssueLinksSection's
 * list + quick-add shape (a modal form here, since logging work has more than one field). */
export function WorkLogSection({ taskId }: WorkLogSectionProps) {
  const [logOpen, setLogOpen] = useState(false)
  const { data: summary } = useWorkLogSummary(taskId)
  const { data, isLoading } = useTaskWorkLogs(taskId, { page: 1, limit: 100, sortOrder: 'desc' })
  const logWork = useLogWork(taskId)
  const { showToast } = useToast()

  async function handleLog(values: WorkLogFormValues) {
    try {
      await logWork.mutateAsync(values)
      setLogOpen(false)
    } catch (err) {
      showToast({
        title: 'Could not log work',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  if (isLoading) return null

  const logs = data?.data ?? []
  const hasEstimate = summary && summary.originalEstimateHours != null
  const estimatePercent = hasEstimate
    ? Math.min(100, Math.round((summary!.totalLoggedHours / summary!.originalEstimateHours!) * 100))
    : 0

  return (
    <div className="rounded-xl border bg-card p-5 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium">Time tracking</h3>
        <Button size="sm" variant="outline" onClick={() => setLogOpen(true)} className="gap-1">
          <Plus className="h-4 w-4" /> Log work
        </Button>
      </div>

      {summary && (
        <div className="mb-4 space-y-1">
          {hasEstimate ? (
            <>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300 ease-smooth"
                  style={{ width: `${estimatePercent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {summary.totalLoggedHours}h logged of {summary.originalEstimateHours}h estimated
                {summary.varianceHours! > 0 && ` (${summary.varianceHours}h over estimate)`}
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              {summary.totalLoggedHours}h logged · no estimate set
            </p>
          )}
        </div>
      )}

      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No work logged yet.</p>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <WorkLogItem key={log.id} log={log} />
          ))}
        </div>
      )}

      <Modal open={logOpen} onOpenChange={setLogOpen} title="Log work">
        <LogWorkForm onSubmit={handleLog} onCancel={() => setLogOpen(false)} />
      </Modal>
    </div>
  )
}
