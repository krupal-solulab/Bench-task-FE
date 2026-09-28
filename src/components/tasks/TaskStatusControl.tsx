import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useUpdateTaskStatus } from '@/hooks/mutations/useTaskMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import { DEFAULT_WORKFLOW, legalTaskTransitions } from '@/lib/status-transitions'
import type { Task } from '@/types/task.types'
import type { Workflow } from '@/types/workflow.types'

export function TaskStatusControl({
  task,
  canEdit,
  workflow = DEFAULT_WORKFLOW,
}: {
  task: Task
  canEdit: boolean
  /** The task's project workflow (custom, or the system default). Defaults to the system
   * default when the caller hasn't fetched it yet, matching every existing project's behavior. */
  workflow?: Workflow
}) {
  const [pending, setPending] = useState(false)
  const updateStatus = useUpdateTaskStatus(task.id)
  const { showToast } = useToast()

  const legalTargets = legalTaskTransitions(workflow, task.status)

  // Module 12's Approval Workflows - the task is frozen from any further status change until the
  // pending transition is approved or rejected (see TaskApprovalActions, rendered alongside this).
  if (task.pendingApproval) {
    return (
      <StatusBadge
        status={`${task.status} (awaiting approval to ${task.pendingApproval.toStatus})`}
        kind="task"
        category={task.statusCategory}
      />
    )
  }

  if (!canEdit || legalTargets.length === 0) {
    return <StatusBadge status={task.status} kind="task" category={task.statusCategory} />
  }

  async function handleChange(next: string) {
    setPending(true)
    try {
      const updated = await updateStatus.mutateAsync(next)
      // A requiresApproval transition doesn't apply immediately - the response's status is still
      // the OLD one, with pendingApproval now set instead. Reflect that distinction in the toast
      // rather than falsely claiming the move already happened.
      if (updated.pendingApproval?.toStatus === next) {
        showToast({ title: `Approval requested to move to ${next}`, variant: 'success' })
      } else {
        showToast({ title: `Task moved to ${next}`, variant: 'success' })
      }
    } catch (err) {
      showToast({
        title: 'Could not change status',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <Select value={task.status} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger className="w-40" aria-label="Change task status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={task.status}>{task.status} (current)</SelectItem>
        {legalTargets.map((status) => (
          <SelectItem key={status} value={status}>
            {status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
