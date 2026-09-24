import { useState } from 'react'
import { Avatar } from '@/components/common/Avatar'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Modal } from '@/components/common/Modal'
import { LogWorkForm } from './LogWorkForm'
import { useUpdateWorkLog, useDeleteWorkLog } from '@/hooks/mutations/useWorkLogMutations'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { formatDate } from '@/lib/date'
import { toApiError } from '@/lib/error'
import type { WorkLogFormValues } from '@/schemas/worklog.schema'
import type { WorkLog } from '@/types/worklog.types'

export function WorkLogItem({ log }: { log: WorkLog }) {
  const { user, hasRole } = useAuth()
  const { showToast } = useToast()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const updateWorkLog = useUpdateWorkLog(log.id)
  const deleteWorkLog = useDeleteWorkLog()

  const isOwn = user?.id === log.user.id
  const canModify = isOwn || hasRole('Admin')

  async function handleSave(values: WorkLogFormValues) {
    try {
      await updateWorkLog.mutateAsync(values)
      setEditing(false)
    } catch (err) {
      showToast({
        title: 'Could not update work log',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleDelete() {
    try {
      await deleteWorkLog.mutateAsync(log.id)
      showToast({ title: 'Work log deleted', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not delete work log',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="flex gap-3">
      <Avatar name={log.user.name} size="sm" />
      <div className="flex-1 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{log.user.name}</span>
          <span className="font-medium text-primary">{log.hours}h</span>
          <span className="text-xs text-muted-foreground">{formatDate(log.workDate)}</span>
          {!log.billable && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
              Non-billable
            </span>
          )}
        </div>
        {log.description && <p className="text-sm text-muted-foreground">{log.description}</p>}
        {canModify && (
          <div className="flex gap-3 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="hover:text-foreground"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="hover:text-destructive"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <Modal open={editing} onOpenChange={setEditing} title="Edit work log">
        <LogWorkForm
          initialValues={log}
          onSubmit={handleSave}
          onCancel={() => setEditing(false)}
          submitLabel="Save changes"
        />
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete work log"
        description="This cannot be undone."
        variant="destructive"
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  )
}
