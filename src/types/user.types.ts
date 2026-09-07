export const ROLES = ['Admin', 'Manager', 'Developer'] as const
export type Role = (typeof ROLES)[number]

export interface User {
  id: string
  name: string
  email: string
  role: Role
  isActive: boolean
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
