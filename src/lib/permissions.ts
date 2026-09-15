import type { MemberPermissions } from '@/types/project.types'
import type { Role } from '@/types/user.types'

export type Capability =
  | 'project:create'
  | 'project:editAny'
  | 'project:delete'
  | 'project:manageMembers'
  | 'task:create'
  | 'task:editAny'
  | 'task:delete'
  | 'task:reassign'
  | 'user:manage'
  | 'dashboard:viewOrgWide'
  | 'platform:manageOrganizations'

/** Mirrors the backend's role -> capability map. Never trust this alone; the API is the real gate. */
const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  Admin: [
    'project:create',
    'project:editAny',
    'project:delete',
    'project:manageMembers',
    'task:create',
    'task:editAny',
    'task:delete',
    'task:reassign',
    'user:manage',
    'dashboard:viewOrgWide',
  ],
  Manager: [
    'project:create',
    'project:editAny',
    'project:delete',
    'project:manageMembers',
    'task:create',
    'task:editAny',
    'task:delete',
    'task:reassign',
    'dashboard:viewOrgWide',
  ],
  Developer: [],
  // Manages organizations only — deliberately empty of every org-data capability, mirroring the
  // backend's hard block on a PlatformAdmin ever touching a tenant's projects/tasks/comments.
  PlatformAdmin: ['platform:manageOrganizations'],
}

export function can(role: Role | undefined, capability: Capability): boolean {
  if (!role) return false
  return ROLE_CAPABILITIES[role].includes(capability)
}

/**
 * A Developer may edit only the status of a task assigned to them; everything else is read-only -
 * unless a project-level grant (see Phase 3's per-project member permissions) extends one of
 * these fields to them specifically for that project. `grant` is optional and additive: omitting
 * it behaves exactly as before this feature existed.
 */
export function canEditTaskField(
  role: Role | undefined,
  field: 'status' | 'other' | 'delete',
  isAssignee: boolean,
  grant?: MemberPermissions | null,
): boolean {
  if (!role) return false
  if (can(role, 'task:editAny')) return true
  if (field === 'status')
    return (role === 'Developer' && isAssignee) || !!grant?.canChangeAnyTaskStatus
  if (field === 'other') return !!grant?.canEditAnyTask
  return !!grant?.canDeleteTask
}

/** Whether the user can create a task in a specific project - their global role, or a project-level grant. */
export function canCreateTaskInProject(
  role: Role | undefined,
  grant?: MemberPermissions | null,
): boolean {
  if (!role) return false
  return can(role, 'task:create') || !!grant?.canCreateTask
}

export function isOwnResource(userId: string | undefined, resourceOwnerId: string): boolean {
  return !!userId && userId === resourceOwnerId
}
