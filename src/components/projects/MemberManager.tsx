import { useState } from 'react'
import { Settings, UserPlus, X } from 'lucide-react'
import { Avatar } from '@/components/common/Avatar'
import { RoleBadge } from '@/components/common/RoleBadge'
import { useCustomRoles } from '@/hooks/queries/useCustomRoles'
import { fromRoleChoice, userRoleLabel } from '@/lib/roles'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { UserSelect } from '@/components/common/UserSelect'
import { FormField } from '@/components/common/FormField'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MemberPermissionsEditor } from './MemberPermissionsEditor'
import { InviteSecretsPanel } from './InviteSecretsPanel'
import { PendingInvitesList } from './PendingInvitesList'
import { PROJECT_INVITE_FORM_ID, ProjectInviteForm } from './ProjectInviteForm'
import { useAddProjectMembers, useRemoveProjectMember } from '@/hooks/mutations/useProjectMutations'
import { useCreateProjectInvite } from '@/hooks/mutations/useProjectInviteMutations'
import { useProjectMemberCandidates } from '@/hooks/queries/useProjects'
import type { ProjectInviteFormValues } from '@/schemas/project-invite.schema'
import type { SentProjectInvite } from '@/types/project-invite.types'
import { useToast } from '@/hooks/useToast'
import { isConflictError, toApiError } from '@/lib/error'
import type { Project, ProjectMember } from '@/types/project.types'

/** Invites only grant member-level roles (never Admin). */
function inviteRole(change: { role: string; customRoleId: string | null }) {
  return {
    role: (change.role === 'Manager' ? 'Manager' : 'Developer') as 'Manager' | 'Developer',
    customRoleId: change.customRoleId,
  }
}

export function MemberManager({ project, canManage }: { project: Project; canManage: boolean }) {
  const [addOpen, setAddOpen] = useState(false)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null)
  const [reassignTo, setReassignTo] = useState<string | null>(null)
  const [needsReassign, setNeedsReassign] = useState(false)
  const [permissionsTarget, setPermissionsTarget] = useState<ProjectMember | null>(null)
  const [addMode, setAddMode] = useState<'existing' | 'invite'>('existing')
  // Set right after an invite is sent/resent: the only time its link + password are visible.
  const [sentInvite, setSentInvite] = useState<SentProjectInvite | null>(null)

  const { data: customRoles } = useCustomRoles()
  const addMembers = useAddProjectMembers(project.id)
  const createInvite = useCreateProjectInvite(project.id)
  const candidates = useProjectMemberCandidates(project.id, canManage && addOpen)
  const removeMember = useRemoveProjectMember(project.id)
  const { showToast } = useToast()

  const nonOwnerMembers = project.members.filter((m) => m.role !== 'owner')

  async function handleAdd() {
    if (!pendingUserId) return
    try {
      await addMembers.mutateAsync([pendingUserId])
      showToast({ title: 'Member added', variant: 'success' })
      closeAddDialog()
    } catch (err) {
      showToast({
        title: 'Could not add member',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleInvite(values: ProjectInviteFormValues) {
    try {
      setSentInvite(
        await createInvite.mutateAsync({
          email: values.email,
          ...inviteRole(fromRoleChoice(values.role, customRoles)),
        }),
      )
      setAddOpen(false)
    } catch (err) {
      showToast({
        title: 'Could not send invitation',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  function closeAddDialog() {
    setAddOpen(false)
    setPendingUserId(null)
    setAddMode('existing')
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
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {member.role === 'owner' ? 'Owner' : 'Member'}
                  <RoleBadge user={member.user} />
                </p>
              </div>
            </div>
            {canManage && member.role !== 'owner' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPermissionsTarget(member)}
                  aria-label={`Edit ${member.user.name}'s permissions`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Settings className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setRemoveTarget({ id: member.user.id, name: member.user.name })}
                  aria-label={`Remove ${member.user.name}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <PendingInvitesList projectId={project.id} canManage={canManage} onResent={setSentInvite} />

      <Modal
        open={addOpen}
        onOpenChange={(open) => (open ? setAddOpen(true) : closeAddDialog())}
        title="Add member"
        description="Add someone from your organization, or invite a new person by email."
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={closeAddDialog}>
              Cancel
            </Button>
            {addMode === 'existing' ? (
              <Button onClick={handleAdd} loading={addMembers.isPending} disabled={!pendingUserId}>
                Add
              </Button>
            ) : (
              <Button type="submit" form={PROJECT_INVITE_FORM_ID} loading={createInvite.isPending}>
                Send invitation
              </Button>
            )}
          </>
        }
      >
        <Tabs value={addMode} onValueChange={(v) => setAddMode(v as 'existing' | 'invite')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Existing user</TabsTrigger>
            <TabsTrigger value="invite">Invite by email</TabsTrigger>
          </TabsList>
          <TabsContent value="existing" className="pt-3">
            {candidates.data && candidates.data.length === 0 ? (
              <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                Everyone in your organization is already in this project.{' '}
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => setAddMode('invite')}
                >
                  Invite someone new
                </button>
              </p>
            ) : (
              <FormField label="User" htmlFor="add-member-select">
                <Select value={pendingUserId ?? ''} onValueChange={setPendingUserId}>
                  <SelectTrigger id="add-member-select" disabled={candidates.isLoading}>
                    <SelectValue
                      placeholder={candidates.isLoading ? 'Loading users...' : 'Choose a user'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(candidates.data ?? []).map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} · {u.email} · {userRoleLabel(u, customRoles)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}
          </TabsContent>
          <TabsContent value="invite" className="pt-3">
            <ProjectInviteForm onSubmit={handleInvite} />
          </TabsContent>
        </Tabs>
      </Modal>

      <Modal
        open={!!sentInvite}
        onOpenChange={(open) => !open && setSentInvite(null)}
        title={sentInvite?.invite.resendCount ? 'Invitation resent' : 'Invitation sent'}
        size="md"
        footer={<Button onClick={() => setSentInvite(null)}>Done</Button>}
      >
        {sentInvite && <InviteSecretsPanel sent={sentInvite} />}
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

      {permissionsTarget && (
        <MemberPermissionsEditor
          projectId={project.id}
          member={permissionsTarget}
          open
          onOpenChange={(open) => !open && setPermissionsTarget(null)}
        />
      )}
    </div>
  )
}
