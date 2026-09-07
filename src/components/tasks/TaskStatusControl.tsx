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
import { legalTaskTransitions } from '@/lib/status-transitions'
import type { Task, TaskStatus } from '@/types/task.types'

export function TaskStatusControl({ task, canEdit }: { task: Task; canEdit: boolean }) {
  const [pending, setPending] = useState(false)
  const updateStatus = useUpdateTaskStatus(task.id)
  const { showToast } = useToast()

  const legalTargets = legalTaskTransitions(task.status)

  if (!canEdit || legalTargets.length === 0) {
    return <StatusBadge status={task.status} kind="task" />
  }

  async function handleChange(next: string) {
    setPending(true)
    try {
      await updateStatus.mutateAsync(next as TaskStatus)
      showToast({ title: `Task moved to ${next}`, variant: 'success' })
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
