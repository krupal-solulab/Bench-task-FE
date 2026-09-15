import { useEffect, useState } from 'react'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { Checkbox } from '@/components/ui/checkbox'
import { useSetMemberPermissions } from '@/hooks/mutations/useProjectMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import { NO_MEMBER_PERMISSIONS } from '@/types/project.types'
import type { MemberPermissions, ProjectMember } from '@/types/project.types'

const CAPABILITY_LABELS: Array<{ key: keyof MemberPermissions; label: string }> = [
  { key: 'canCreateTask', label: 'Create tasks' },
  { key: 'canEditAnyTask', label: 'Edit any task' },
  { key: 'canDeleteTask', label: 'Delete tasks' },
  { key: 'canChangeAnyTaskStatus', label: "Change any task's status" },
  { key: 'canManageSprints', label: 'Manage sprints' },
]

export interface MemberPermissionsEditorProps {
  projectId: string
  member: ProjectMember
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** A small settings modal granting/revoking a member's extra per-project task/sprint
 * capabilities, beyond what their global role already allows on this one project. */
export function MemberPermissionsEditor({
  projectId,
  member,
  open,
  onOpenChange,
}: MemberPermissionsEditorProps) {
  const [perms, setPerms] = useState<MemberPermissions>(member.permissions ?? NO_MEMBER_PERMISSIONS)
  useEffect(() => {
    setPerms(member.permissions ?? NO_MEMBER_PERMISSIONS)
  }, [member])

  const setPermissions = useSetMemberPermissions(projectId)
  const { showToast } = useToast()

  async function handleSave() {
    try {
      await setPermissions.mutateAsync({ userId: member.user.id, patch: perms })
      showToast({ title: 'Permissions updated', variant: 'success' })
      onOpenChange(false)
    } catch (err) {
      showToast({
        title: 'Could not update permissions',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`${member.user.name}'s permissions`}
      description="Extra capabilities on this project, beyond their normal role."
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} loading={setPermissions.isPending}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {CAPABILITY_LABELS.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={perms[key]}
              onCheckedChange={(checked) =>
                setPerms((prev) => ({ ...prev, [key]: checked === true }))
              }
            />
            {label}
          </label>
        ))}
      </div>
    </Modal>
  )
}
