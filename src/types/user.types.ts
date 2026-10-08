import type { MemberPermissions } from './project.types'
import type { CustomRoleSummary } from './custom-role.types'

export const ROLES = ['Admin', 'Manager', 'Developer', 'PlatformAdmin'] as const
export type Role = (typeof ROLES)[number]

/** Org-scoped roles only — never offer PlatformAdmin in a role picker for an org user (the backend rejects it). */
export const ORG_ROLES = ['Admin', 'Manager', 'Developer'] as const
export type OrgRole = (typeof ORG_ROLES)[number]

/** Roles a project member can hold - and so what a project invite can grant. */
export const PROJECT_MEMBER_ROLES = ['Developer', 'Manager'] as const
export type ProjectMemberRole = (typeof PROJECT_MEMBER_ROLES)[number]

export interface User {
  id: string
  name: string
  email: string
  role: Role
  isActive: boolean
  organizationId: string | null
  /** Module 11 gap-closure - display time zone; null/absent = the browser's. */
  timezone?: string | null
  /** Signed in with a project invite's temporary password and must set their own first. */
  mustChangePassword?: boolean
  /** A custom role (QA, DevOps, ...); `role` then holds its access level. */
  customRoleId?: string | null
  /** The signed-in user’s custom role with its permissions (from /auth/me and login only). */
  customRole?: CustomRoleSummary | null
  /** The role the user's permissions come from (custom role or built-in Manager/Developer) and
   * its organization-wide permissions - projects may override them (from /auth/me and login). */
  roleId?: string | null
  rolePermissions?: MemberPermissions | null
  createdAt: string
  updatedAt: string
}

/** Module 8 gap-closure - per-user outcome of `POST /users/bulk/role|status`. */
export interface BulkUserResult {
  succeeded: string[]
  failed: { userId: string; message: string }[]
}

export interface UserListQuery {
  page?: number
  limit?: number
  search?: string
  role?: Role
  /** Only users holding this custom role. */
  customRoleId?: string
  isActive?: boolean
  sortBy?: 'name' | 'email' | 'createdAt' | 'role'
  sortOrder?: 'asc' | 'desc'
}

/** A role assignment: a built-in role, optionally with a custom role (which then sets `role`). */
export interface RoleChange {
  role: OrgRole
  customRoleId: string | null
}

export interface CreateUserPayload extends RoleChange {
  name: string
  email: string
  password: string
}

export interface UpdateUserPayload {
  name?: string
  email?: string
  /** Self-service profile only (PATCH /auth/me). */
  timezone?: string | null
}
