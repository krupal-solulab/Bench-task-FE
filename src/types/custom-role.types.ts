import type { MemberPermissions } from './project.types'
import type { ProjectMemberRole } from './user.types'

export const CUSTOM_ROLE_COLORS = [
  'slate',
  'blue',
  'violet',
  'emerald',
  'amber',
  'rose',
  'cyan',
  'orange',
] as const
export type CustomRoleColor = (typeof CUSTOM_ROLE_COLORS)[number]

/** An organization-defined role (QA, DevOps, ...) on top of a built-in access level. */
export interface CustomRole {
  id: string
  name: string
  description: string
  color: CustomRoleColor
  /** The built-in role its holders get - Developer ("Member") or Manager. */
  accessLevel: ProjectMemberRole
  /** Added to every project the holder is a member of. */
  permissions: MemberPermissions
  /** 'Manager' / 'Developer' for the built-in roles (permissions editable only); null = custom. */
  builtInRole: 'Manager' | 'Developer' | null
  memberCount: number
  createdAt: string
  updatedAt: string
}

/** What /auth/me (and login) attach to the signed-in user. */
export type CustomRoleSummary = Pick<
  CustomRole,
  'id' | 'name' | 'color' | 'accessLevel' | 'permissions'
>

export interface CustomRolePayload {
  name: string
  description?: string
  color: CustomRoleColor
  accessLevel: ProjectMemberRole
  permissions: MemberPermissions
}
