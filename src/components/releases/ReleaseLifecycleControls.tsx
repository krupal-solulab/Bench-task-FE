import { useState } from 'react'
import { Button } from '@/components/common/Button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useDeleteRelease, useReleaseAction } from '@/hooks/mutations/useReleaseMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import type { Release } from '@/types/release.types'

export interface ReleaseLifecycleControlsProps {
  release: Release
  projectId: string
  canManage: boolean
  onEdit: () => void
}

/** Mirrors SprintLifecycleControls' shape: a status badge plus the actions legal from that
 * status - see release-status.rules.ts on the backend for the same transition table. */
export function ReleaseLifecycleControls({
  release,
  projectId,
  canManage,
  onEdit,
}: ReleaseLifecycleControlsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const releaseAction = useReleaseAction(projectId)
  const deleteRelease = useDeleteRelease(projectId)
  const { showToast } = useToast()

  async function handleAction(action: 'release' | 'unrelease' | 'archive', successLabel: string) {
    try {
      await releaseAction.mutateAsync({ releaseId: release.id, action })
      showToast({ title: successLabel, variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not update release',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleDelete() {
    try {
      await deleteRelease.mutateAsync(release.id)
      showToast({ title: 'Release deleted', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not delete release',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusBadge status={release.status} kind="release" />

      {canManage && release.status !== 'Archived' && (
        <Button size="sm" variant="outline" onClick={onEdit}>
          Edit
        </Button>
      )}

      {canManage && release.status === 'Unreleased' && (
        <Button
          size="sm"
          onClick={() => void handleAction('release', `${release.name} released`)}
          loading={releaseAction.isPending}
        >
          Release
        </Button>
      )}

      {canManage && release.status === 'Released' && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => void handleAction('unrelease', `${release.name} reverted to Unreleased`)}
          loading={releaseAction.isPending}
        >
          Unrelease
        </Button>
      )}

      {canManage && release.status !== 'Archived' && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => void handleAction('archive', `${release.name} archived`)}
          loading={releaseAction.isPending}
        >
          Archive
        </Button>
      )}

      {canManage && (
        <Button size="sm" variant="destructive" onClick={() => setDeleteOpen(true)}>
          Delete
        </Button>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete release"
        description={`Delete "${release.name}"? Any issues tagged with it will have it removed from their Fix/Affects Version. This cannot be undone.`}
        variant="destructive"
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  )
}
