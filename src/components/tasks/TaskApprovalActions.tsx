import { Check, X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { useApproveTransition, useRejectTransition } from '@/hooks/mutations/useTaskMutations'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import { toApiError } from '@/lib/error'
import type { Task } from '@/types/task.types'

/**
 * Module 12's Approval Workflows - renders nothing unless `task.pendingApproval` is set. Shown to
 * any authenticated org member who can see the task; the backend is the real authority on who may
 * actually decide (all 4 grantee kinds, including team/project-role membership this component
 * can't cheaply resolve client-side) - an ineligible click just 403s with a clear toast rather than
 * silently doing nothing, which is an acceptable, simpler tradeoff than duplicating that
 * resolution here.
 */
export function TaskApprovalActions({ task }: { task: Task }) {
  const approve = useApproveTransition(task.id)
  const reject = useRejectTransition(task.id)
  const { showToast } = useToast()
  const { user } = useAuth()

  if (!task.pendingApproval) return null
  // Module 12 gap-closure: multi-approver requests show how many approvals they have so far.
  const required = Math.max(1, task.pendingApproval.requiredApprovals ?? 1)
  const approvals = task.pendingApproval.approvals ?? []
  const alreadyApproved = !!user && approvals.some((a) => a.user === user.id)

  async function handleApprove() {
    try {
      const updated = await approve.mutateAsync()
      showToast({
        title: updated?.pendingApproval
          ? `Approval recorded - ${updated.pendingApproval.approvals?.length ?? 0} of ${required}`
          : `Approved - task moved to ${task.pendingApproval!.toStatus}`,
        variant: 'success',
      })
    } catch (err) {
      showToast({
        title: 'Could not approve',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleReject() {
    try {
      await reject.mutateAsync()
      showToast({ title: 'Transition rejected', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not reject',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <>
      {required > 1 && (
        <span className="text-xs text-muted-foreground" aria-label="Approval progress">
          {approvals.length} of {required} approvals
        </span>
      )}
      <Button
        variant="outline"
        size="sm"
        className="gap-1"
        loading={approve.isPending}
        disabled={alreadyApproved}
        title={alreadyApproved ? 'You have already approved this request' : undefined}
        onClick={() => void handleApprove()}
      >
        <Check className="h-4 w-4" /> {alreadyApproved ? 'Approved' : 'Approve'}
      </Button>
      <Button
        variant="destructive"
        size="sm"
        className="gap-1"
        loading={reject.isPending}
        onClick={() => void handleReject()}
      >
        <X className="h-4 w-4" /> Reject
      </Button>
    </>
  )
}
