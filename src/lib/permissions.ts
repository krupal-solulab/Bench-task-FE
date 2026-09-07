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
}

export function can(role: Role | undefined, capability: Capability): boolean {
  if (!role) return false
  return ROLE_CAPABILITIES[role].includes(capability)
}

/** A Developer may edit only the status of a task assigned to them; everything else is read-only. */
export function canEditTaskField(
  role: Role | undefined,
  field: 'status' | 'other',
  isAssignee: boolean,
): boolean {
  if (!role) return false
  if (can(role, 'task:editAny')) return true
  return role === 'Developer' && field === 'status' && isAssignee
}

export function isOwnResource(userId: string | undefined, resourceOwnerId: string): boolean {
  return !!userId && userId === resourceOwnerId
}
