import { useState } from 'react'
import { Button } from '@/components/common/Button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Modal } from '@/components/common/Modal'
import { StatusBadge } from '@/components/common/StatusBadge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useCompleteSprint,
  useDeleteSprint,
  useStartSprint,
} from '@/hooks/mutations/useSprintMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import type { Sprint } from '@/types/sprint.types'

const BACKLOG_DESTINATION = '__backlog__'

export interface SprintLifecycleControlsProps {
  sprint: Sprint
  projectId: string
  canManage: boolean
  onEdit: () => void
  /** Other Planned sprints in the project - offered as a destination for incomplete issues when
   * completing this one (BRD 6.3's "PM's choice"). Omit/empty to only offer the backlog. */
  plannedSprints?: Sprint[]
}

export function SprintLifecycleControls({
  sprint,
  projectId,
  canManage,
  onEdit,
  plannedSprints = [],
}: SprintLifecycleControlsProps) {
  const [completeOpen, setCompleteOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [destination, setDestination] = useState(BACKLOG_DESTINATION)
  const startSprint = useStartSprint(projectId)
  const completeSprint = useCompleteSprint(projectId)
  const deleteSprint = useDeleteSprint(projectId)
  const { showToast } = useToast()
  const otherPlannedSprints = plannedSprints.filter((s) => s.id !== sprint.id)

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
      await completeSprint.mutateAsync({
        sprintId: sprint.id,
        nextSprintId: destination === BACKLOG_DESTINATION ? null : destination,
      })
      showToast({ title: `${sprint.name} completed`, variant: 'success' })
      setCompleteOpen(false)
      setDestination(BACKLOG_DESTINATION)
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

      <Modal
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        title="Complete sprint"
        description={`Choose where incomplete tasks in "${sprint.name}" should go. This cannot be undone.`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCompleteOpen(false)}>
              Cancel
            </Button>
            <Button loading={completeSprint.isPending} onClick={() => void handleComplete()}>
              Complete
            </Button>
          </>
        }
      >
        <Select value={destination} onValueChange={setDestination}>
          <SelectTrigger aria-label="Move incomplete issues to">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={BACKLOG_DESTINATION}>Backlog</SelectItem>
            {otherPlannedSprints.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Modal>

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
