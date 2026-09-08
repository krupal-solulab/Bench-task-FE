import type { User } from './user.types'

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterOrganizationPayload {
  organizationName: string
  adminName: string
  adminEmail: string
  adminPassword: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse extends AuthTokens {
  user: User
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}
