import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Checkbox } from '@/components/ui/checkbox'
import { UserSelect } from '@/components/common/UserSelect'
import { GrantTeamsAndRoles } from '@/components/admin/GrantTeamsAndRoles'
import { useUpdateDefaultApprovers } from '@/hooks/mutations/useProjectMutations'
import { useAssignableUsers } from '@/hooks/queries/useUsers'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import { ORG_ROLES } from '@/types/user.types'
import type { OrgRole } from '@/types/user.types'
import type { DefaultApproversPayload } from '@/types/project.types'

export interface DefaultApproversFormProps {
  projectId: string
  defaultApprovers: DefaultApproversPayload | null
  canManage: boolean
}

const EMPTY_GRANT: DefaultApproversPayload = {
  allowedRoles: [],
  allowedUserIds: [],
  allowedTeamIds: [],
  allowedProjectRoleIds: [],
}

/**
 * Module 6 gap-closure: a project-wide fallback approver pool for Approval Workflows, rendered
 * ONCE on the Workflow tab (not per-issue-type, unlike WorkflowSettingsForm below it) since it's a
 * project-level setting. Offers all 4 grantee kinds - roles, users, and (gap-closure) teams and
 * project roles - the same as WorkflowSettingsForm's per-transition approver editor.
 */
export function DefaultApproversForm({
  projectId,
  defaultApprovers,
  canManage,
}: DefaultApproversFormProps) {
  const [grant, setGrant] = useState<DefaultApproversPayload>(defaultApprovers ?? EMPTY_GRANT)
  const updateDefaultApprovers = useUpdateDefaultApprovers(projectId)
  const { data: assignableUsers } = useAssignableUsers()
  const userById = new Map((assignableUsers?.data ?? []).map((u) => [u.id, u]))
  const { showToast } = useToast()

  function toggleRole(role: OrgRole, checked: boolean) {
    setGrant({
      ...grant,
      allowedRoles: checked
        ? [...grant.allowedRoles, role]
        : grant.allowedRoles.filter((r) => r !== role),
    })
  }

  function addUser(userId: string | null) {
    if (!userId || grant.allowedUserIds.includes(userId)) return
    setGrant({ ...grant, allowedUserIds: [...grant.allowedUserIds, userId] })
  }

  function removeUser(userId: string) {
    setGrant({ ...grant, allowedUserIds: grant.allowedUserIds.filter((id) => id !== userId) })
  }

  async function handleSave() {
    try {
      const saved = await updateDefaultApprovers.mutateAsync(grant)
      setGrant(saved.defaultApprovers ?? EMPTY_GRANT)
      showToast({ title: 'Default approvers updated', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not update default approvers',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  if (!canManage) {
    const teamCount = grant.allowedTeamIds?.length ?? 0
    const projectRoleCount = grant.allowedProjectRoleIds?.length ?? 0
    const hasAny =
      grant.allowedRoles.length > 0 ||
      grant.allowedUserIds.length > 0 ||
      teamCount > 0 ||
      projectRoleCount > 0
    return (
      <div className="space-y-2">
        <h3 className="font-medium">Default approvers</h3>
        {hasAny ? (
          <p className="text-sm text-muted-foreground">
            {[
              ...grant.allowedRoles,
              ...grant.allowedUserIds.map((id) => userById.get(id)?.name ?? id),
              ...(teamCount ? [`${teamCount} team${teamCount === 1 ? '' : 's'}`] : []),
              ...(projectRoleCount
                ? [`${projectRoleCount} project role${projectRoleCount === 1 ? '' : 's'}`]
                : []),
            ].join(', ')}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">None configured.</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div>
        <h3 className="font-medium">Default approvers</h3>
        <p className="text-xs text-muted-foreground">
          Can approve ANY approval-gated transition in this project, in addition to (never instead
          of) whoever each transition&apos;s own rule names below.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-muted-foreground">Roles:</span>
        {ORG_ROLES.map((role) => (
          <label
            key={role}
            className="flex items-center gap-1 text-xs"
            htmlFor={`default-approver-role-${role}`}
          >
            <Checkbox
              id={`default-approver-role-${role}`}
              aria-label={`Let ${role} approve any transition by default`}
              checked={grant.allowedRoles.includes(role)}
              onCheckedChange={(checked) => toggleRole(role, checked === true)}
            />
            {role}
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Users:</span>
        {grant.allowedUserIds.map((userId) => (
          <span
            key={userId}
            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
          >
            {userById.get(userId)?.name ?? userId}
            <button
              type="button"
              onClick={() => removeUser(userId)}
              aria-label={`Remove ${userById.get(userId)?.name ?? userId} as a default approver`}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <UserSelect
        value={null}
        onChange={addUser}
        allowUnassigned={false}
        placeholder="+ Add a default approver…"
      />

      <GrantTeamsAndRoles
        idPrefix="Default approvers"
        allowedTeamIds={grant.allowedTeamIds ?? []}
        allowedProjectRoleIds={grant.allowedProjectRoleIds ?? []}
        onChangeTeamIds={(ids) => setGrant({ ...grant, allowedTeamIds: ids })}
        onChangeProjectRoleIds={(ids) => setGrant({ ...grant, allowedProjectRoleIds: ids })}
      />

      <div className="flex justify-end border-t pt-3">
        <Button
          type="button"
          onClick={() => void handleSave()}
          loading={updateDefaultApprovers.isPending}
        >
          Save default approvers
        </Button>
      </div>
    </div>
  )
}
