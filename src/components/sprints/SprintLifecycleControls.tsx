import { useState } from 'react'
import { Button } from '@/components/common/Button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { StatusBadge } from '@/components/common/StatusBadge'
import {
  useCompleteSprint,
  useDeleteSprint,
  useStartSprint,
} from '@/hooks/mutations/useSprintMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import type { Sprint } from '@/types/sprint.types'

export interface SprintLifecycleControlsProps {
  sprint: Sprint
  projectId: string
  canManage: boolean
  onEdit: () => void
}

export function SprintLifecycleControls({
  sprint,
  projectId,
  canManage,
  onEdit,
}: SprintLifecycleControlsProps) {
  const [completeOpen, setCompleteOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const startSprint = useStartSprint(projectId)
  const completeSprint = useCompleteSprint(projectId)
  const deleteSprint = useDeleteSprint(projectId)
  const { showToast } = useToast()

  async function handleStart() {
    try {
      await startSprint.mutateAsync(sprint.id)
      showToast({ title: `${sprint.name} started`, variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not start sprint',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleComplete() {
    try {
      await completeSprint.mutateAsync(sprint.id)
      showToast({ title: `${sprint.name} completed`, variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not complete sprint',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleDelete() {
    try {
      await deleteSprint.mutateAsync(sprint.id)
      showToast({ title: 'Sprint deleted', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not delete sprint',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="flex items-center gap-2">
      <StatusBadge status={sprint.status} kind="sprint" />

      {canManage && sprint.status === 'Planned' && (
        <>
          <Button size="sm" variant="outline" onClick={onEdit}>
            Edit
          </Button>
          <Button size="sm" onClick={() => void handleStart()} loading={startSprint.isPending}>
            Start sprint
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setDeleteOpen(true)}>
            Delete
          </Button>
        </>
      )}

      {canManage && sprint.status === 'Active' && (
        <>
          <Button size="sm" variant="outline" onClick={onEdit}>
            Edit
          </Button>
          <Button size="sm" onClick={() => setCompleteOpen(true)}>
            Complete sprint
          </Button>
        </>
      )}

      <ConfirmDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        title="Complete sprint"
        description={`Any incomplete tasks in "${sprint.name}" will be moved back to the backlog. This cannot be undone.`}
        confirmLabel="Complete"
        onConfirm={handleComplete}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete sprint"
        description={`Delete "${sprint.name}"? This cannot be undone.`}
        variant="destructive"
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  )
}
