export const ROLES = ['Admin', 'Manager', 'Developer', 'PlatformAdmin'] as const
export type Role = (typeof ROLES)[number]

/** Org-scoped roles only — never offer PlatformAdmin in a role picker for an org user (the backend rejects it). */
export const ORG_ROLES = ['Admin', 'Manager', 'Developer'] as const
export type OrgRole = (typeof ORG_ROLES)[number]

export interface User {
  id: string
  name: string
  email: string
  role: Role
  isActive: boolean
  organizationId: string | null
  createdAt: string
  updatedAt: string
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
}
