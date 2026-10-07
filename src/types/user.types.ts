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
  isActive?: boolean
  sortBy?: 'name' | 'email' | 'createdAt' | 'role'
  sortOrder?: 'asc' | 'desc'
}

export interface CreateUserPayload {
  name: string
  email: string
  password: string
  role: Role
}

export interface UpdateUserPayload {
  name?: string
  email?: string
  /** Self-service profile only (PATCH /auth/me). */
  timezone?: string | null
}
