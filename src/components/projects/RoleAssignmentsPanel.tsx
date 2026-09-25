import { X } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserSelect } from '@/components/common/UserSelect'
import { useProjectRoles } from '@/hooks/queries/useProjectRoles'
import { useTeams } from '@/hooks/queries/useTeams'
import { useAssignableUsers } from '@/hooks/queries/useUsers'
import { useSetRoleAssignment } from '@/hooks/mutations/useProjectMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import type { ProjectRoleAssignment } from '@/types/project.types'

interface RoleRowProps {
  projectId: string
  roleId: string
  roleName: string
  assignment: ProjectRoleAssignment | undefined
}

function RoleRow({ projectId, roleId, roleName, assignment }: RoleRowProps) {
  const { data: teams } = useTeams()
  const { data: users } = useAssignableUsers()
  const setAssignment = useSetRoleAssignment(projectId)
  const { showToast } = useToast()

  const userIds = assignment?.userIds ?? []
  const teamIds = assignment?.teamIds ?? []
  const userById = new Map((users?.data ?? []).map((u) => [u.id, u]))
  const teamById = new Map((teams ?? []).map((t) => [t.id, t]))
  const availableTeams = (teams ?? []).filter((t) => !teamIds.includes(t.id))

  async function save(patch: { userIds?: string[]; teamIds?: string[] }) {
    try {
      await setAssignment.mutateAsync({ projectRoleId: roleId, ...patch })
    } catch (err) {
      showToast({
        title: `Could not update ${roleName}`,
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-sm font-medium">{roleName}</p>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Users</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {userIds.map((userId) => (
            <span
              key={userId}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
            >
              {userById.get(userId)?.name ?? userId}
              <button
                type="button"
                onClick={() => void save({ userIds: userIds.filter((id) => id !== userId) })}
                aria-label={`Remove ${userById.get(userId)?.name ?? userId} from ${roleName}`}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <UserSelect
          value={null}
          onChange={(userId) => {
            if (!userId || userIds.includes(userId)) return
            void save({ userIds: [...userIds, userId] })
          }}
          allowUnassigned={false}
          placeholder="+ Add a user…"
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Teams</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {teamIds.map((teamId) => (
            <span
              key={teamId}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
            >
              {teamById.get(teamId)?.name ?? teamId}
              <button
                type="button"
                onClick={() => void save({ teamIds: teamIds.filter((id) => id !== teamId) })}
                aria-label={`Remove ${teamById.get(teamId)?.name ?? teamId} from ${roleName}`}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        {availableTeams.length > 0 && (
          <Select value="" onValueChange={(v) => void save({ teamIds: [...teamIds, v] })}>
            <SelectTrigger className="h-8 text-xs" aria-label={`${roleName}: add a team`}>
              <SelectValue placeholder="+ Add a team…" />
            </SelectTrigger>
            <SelectContent>
              {availableTeams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  )
}

export interface RoleAssignmentsPanelProps {
  projectId: string
  roleAssignments: ProjectRoleAssignment[]
}

/** Module 6: for each org-wide Project Role, who fills it *on this specific project* - the
 * definitions themselves live on the Admin-only Project Roles page; this is the per-project
 * membership half (same split as Permission Scheme authoring vs. assignment). */
export function RoleAssignmentsPanel({ projectId, roleAssignments }: RoleAssignmentsPanelProps) {
  const { data: roles } = useProjectRoles()
  const byRoleId = new Map(roleAssignments.map((a) => [a.projectRoleId, a]))

  if (!roles || roles.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="font-medium">Role assignments</h3>
        <p className="text-sm text-muted-foreground">
          No project roles exist yet - create one from Admin &rsaquo; Project Roles.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-medium">Role assignments</h3>
        <p className="text-sm text-muted-foreground">
          Assign users/teams to each project role, for use in this project's Permission/Security
          Scheme grants.
        </p>
      </div>
      {roles.map((role) => (
        <RoleRow
          key={role.id}
          projectId={projectId}
          roleId={role.id}
          roleName={role.name}
          assignment={byRoleId.get(role.id)}
        />
      ))}
    </div>
  )
}
