import { useState } from 'react'
import { UserPlus, X } from 'lucide-react'
import { Avatar } from '@/components/common/Avatar'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { UserSelect } from '@/components/common/UserSelect'
import { FormField } from '@/components/common/FormField'
import { useAddProjectMembers, useRemoveProjectMember } from '@/hooks/mutations/useProjectMutations'
import { useToast } from '@/hooks/useToast'
import { isConflictError, toApiError } from '@/lib/error'
import type { Project } from '@/types/project.types'

export function MemberManager({ project, canManage }: { project: Project; canManage: boolean }) {
  const [addOpen, setAddOpen] = useState(false)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null)
  const [reassignTo, setReassignTo] = useState<string | null>(null)
  const [needsReassign, setNeedsReassign] = useState(false)

  const addMembers = useAddProjectMembers(project.id)
  const removeMember = useRemoveProjectMember(project.id)
  const { showToast } = useToast()

  const nonOwnerMembers = project.members.filter((m) => m.role !== 'owner')

  async function handleAdd() {
    if (!pendingUserId) return
    try {
      await addMembers.mutateAsync([pendingUserId])
      showToast({ title: 'Member added', variant: 'success' })
      setPendingUserId(null)
      setAddOpen(false)
    } catch (err) {
      showToast({
        title: 'Could not add member',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleRemove() {
    if (!removeTarget) return
    try {
      await removeMember.mutateAsync({
        userId: removeTarget.id,
        reassignTo: reassignTo ?? undefined,
      })
      showToast({ title: 'Member removed', variant: 'success' })
      resetRemoveState()
    } catch (err) {
      if (isConflictError(err)) {
        setNeedsReassign(true)
        return
      }
      showToast({
        title: 'Could not remove member',
        description: toApiError(err).message,
        variant: 'destructive',
      })
      resetRemoveState()
    }
  }

  function resetRemoveState() {
    setRemoveTarget(null)
    setReassignTo(null)
    setNeedsReassign(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Members</h3>
        {canManage && (
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="gap-1">
            <UserPlus className="h-4 w-4" /> Add member
          </Button>
        )}
      </div>

      <ul className="space-y-2">
        {project.members.map((member) => (
          <li
            key={member.user.id}
            className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <Avatar name={member.user.name} size="sm" />
              <div>
                <p className="text-sm font-medium leading-tight">{member.user.name}</p>
                <p className="text-xs text-muted-foreground">{member.role}</p>
              </div>
            </div>
            {canManage && member.role !== 'owner' && (
              <button
                type="button"
                onClick={() => setRemoveTarget({ id: member.user.id, name: member.user.name })}
                aria-label={`Remove ${member.user.name}`}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>

      <Modal
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add member"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} loading={addMembers.isPending} disabled={!pendingUserId}>
              Add
            </Button>
          </>
        }
      >
        <FormField label="Developer" htmlFor="add-member-select">
          <UserSelect
            id="add-member-select"
            value={pendingUserId}
            onChange={setPendingUserId}
            allowUnassigned={false}
          />
        </FormField>
      </Modal>

      <ConfirmDialog
        open={!!removeTarget && !needsReassign}
        onOpenChange={(open) => !open && resetRemoveState()}
        title="Remove member"
        description={`Remove ${removeTarget?.name} from this project?`}
        variant="destructive"
        confirmLabel="Remove"
        onConfirm={handleRemove}
      />

      <Modal
        open={needsReassign}
        onOpenChange={(open) => !open && resetRemoveState()}
        title="Reassign open tasks"
        description={`${removeTarget?.name} has open tasks in this project. Choose someone to reassign them to before removing.`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={resetRemoveState}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              loading={removeMember.isPending}
              disabled={!reassignTo}
            >
              Reassign & remove
            </Button>
          </>
        }
      >
        <FormField label="Reassign to" htmlFor="reassign-select">
          <UserSelect
            id="reassign-select"
            value={reassignTo}
            onChange={setReassignTo}
            allowUnassigned={false}
            memberIds={nonOwnerMembers
              .filter((m) => m.user.id !== removeTarget?.id)
              .map((m) => m.user.id)}
          />
        </FormField>
      </Modal>
    </div>
  )
}
