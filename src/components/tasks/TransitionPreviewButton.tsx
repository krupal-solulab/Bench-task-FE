import { useState } from 'react'
import { CheckCircle2, ListChecks, ShieldCheck, XCircle, Zap } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { Spinner } from '@/components/common/Spinner'
import { useTransitionPreview } from '@/hooks/queries/useTasks'
import { toApiError } from '@/lib/error'
import type { TransitionPreviewItem } from '@/types/task.types'

function approverSummary(item: TransitionPreviewItem): string {
  const parts = [
    ...item.approverRoles,
    ...(item.approverUserCount ? [`${item.approverUserCount} named user(s)`] : []),
    ...(item.approverTeamCount ? [`${item.approverTeamCount} team(s)`] : []),
    ...(item.approverProjectRoleCount ? [`${item.approverProjectRoleCount} project role(s)`] : []),
  ]
  return parts.join(', ') || 'the project default approvers'
}

/**
 * Module 12 gap-closure - workflow dry-run. Lists every status this issue could move to next:
 * whether you can make that move right now (and why not), whether it needs approval, and which
 * automation rules would run. Read-only - nothing changes until you actually change the status.
 */
export function TransitionPreviewButton({ taskId }: { taskId: string }) {
  const [open, setOpen] = useState(false)
  const { data, isLoading, isError, error } = useTransitionPreview(open ? taskId : undefined)

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1" onClick={() => setOpen(true)}>
        <ListChecks className="h-4 w-4" /> Preview transitions
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Preview transitions"
        description="What would happen if you moved this issue - nothing is changed."
        size="lg"
      >
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner /> Checking transitions…
          </div>
        )}
        {isError && <p className="text-sm text-destructive">{toApiError(error).message}</p>}
        {data && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Currently <span className="font-medium text-foreground">{data.currentStatus}</span>
              {data.pendingApprovalTo && <> - a move to {data.pendingApprovalTo} awaits approval</>}
            </p>
            {data.transitions.length === 0 && (
              <p className="text-sm text-muted-foreground">
                The workflow has no transitions out of this status.
              </p>
            )}
            <ul className="space-y-2">
              {data.transitions.map((item) => (
                <li
                  key={item.toStatus}
                  aria-label={`Transition to ${item.toStatus}`}
                  className="space-y-1.5 rounded-lg border p-3 text-sm"
                >
                  <div className="flex items-center gap-2 font-medium">
                    {item.allowed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
                    )}
                    {item.toStatus}
                    <span className="text-xs font-normal text-muted-foreground">
                      {item.allowed ? 'You can make this move' : 'Blocked'}
                    </span>
                  </div>
                  {item.blockers.length > 0 && (
                    <ul className="list-disc space-y-0.5 pl-9 text-xs text-destructive">
                      {item.blockers.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  )}
                  {item.requiresApproval && (
                    <p className="flex items-center gap-1.5 pl-6 text-xs text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      Needs {item.requiredApprovals} approval
                      {item.requiredApprovals === 1 ? '' : 's'} from {approverSummary(item)}
                    </p>
                  )}
                  {item.automations.map((a, i) => (
                    <p
                      key={`${a.ruleName}-${i}`}
                      className="flex items-center gap-1.5 pl-6 text-xs text-muted-foreground"
                    >
                      <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                      Automation "{a.ruleName}" - {a.actionType} {a.value}
                      {a.whenApproved ? ' (once approved)' : ''}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>
    </>
  )
}
