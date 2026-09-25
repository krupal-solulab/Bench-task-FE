import { X } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTeams } from '@/hooks/queries/useTeams'
import { useProjectRoles } from '@/hooks/queries/useProjectRoles'

export interface GrantTeamsAndRolesProps {
  allowedTeamIds: string[]
  allowedProjectRoleIds: string[]
  onChangeTeamIds: (ids: string[]) => void
  onChangeProjectRoleIds: (ids: string[]) => void
  /** Unique per grant/level row, so aria-labels don't collide across rows. */
  idPrefix: string
}

/** Module 6's Team/Project Role grantee pickers, shared by PermissionSchemeForm (per-action
 * grants) and SecuritySchemeForm (per-level grants) - both schemes' grant/level shape now
 * supports the same 4 grantee kinds (role, user, team, project role), so this is the one place the
 * team/project-role half of that UI lives. */
export function GrantTeamsAndRoles({
  allowedTeamIds,
  allowedProjectRoleIds,
  onChangeTeamIds,
  onChangeProjectRoleIds,
  idPrefix,
}: GrantTeamsAndRolesProps) {
  const { data: teams } = useTeams()
  const { data: projectRoles } = useProjectRoles()
  const teamById = new Map((teams ?? []).map((t) => [t.id, t]))
  const roleById = new Map((projectRoles ?? []).map((r) => [r.id, r]))

  const availableTeams = (teams ?? []).filter((t) => !allowedTeamIds.includes(t.id))
  const availableRoles = (projectRoles ?? []).filter((r) => !allowedProjectRoleIds.includes(r.id))

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Teams</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {allowedTeamIds.map((teamId) => (
            <span
              key={teamId}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
            >
              {teamById.get(teamId)?.name ?? teamId}
              <button
                type="button"
                onClick={() => onChangeTeamIds(allowedTeamIds.filter((id) => id !== teamId))}
                aria-label={`Remove ${teamById.get(teamId)?.name ?? teamId}`}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        {availableTeams.length > 0 && (
          <Select value="" onValueChange={(v) => onChangeTeamIds([...allowedTeamIds, v])}>
            <SelectTrigger className="h-8 text-xs" aria-label={`${idPrefix}: add a team`}>
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

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Project roles</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {allowedProjectRoleIds.map((roleId) => (
            <span
              key={roleId}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
            >
              {roleById.get(roleId)?.name ?? roleId}
              <button
                type="button"
                onClick={() =>
                  onChangeProjectRoleIds(allowedProjectRoleIds.filter((id) => id !== roleId))
                }
                aria-label={`Remove ${roleById.get(roleId)?.name ?? roleId}`}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        {availableRoles.length > 0 && (
          <Select
            value=""
            onValueChange={(v) => onChangeProjectRoleIds([...allowedProjectRoleIds, v])}
          >
            <SelectTrigger className="h-8 text-xs" aria-label={`${idPrefix}: add a project role`}>
              <SelectValue placeholder="+ Add a project role…" />
            </SelectTrigger>
            <SelectContent>
              {availableRoles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  )
}
