import { apiGet, apiPatch, apiPost } from './api-client'
import type {
  AuthResponse,
  AuthTokens,
  ChangePasswordPayload,
  LoginPayload,
  RegisterOrganizationPayload,
} from '@/types/auth.types'
import type { User } from '@/types/user.types'

export const authService = {
  login: (payload: LoginPayload) => apiPost<AuthResponse>('/auth/login', payload),

  registerOrganization: (payload: RegisterOrganizationPayload) =>
    apiPost<AuthResponse>('/auth/register-organization', payload),

  refresh: (refreshToken: string) => apiPost<AuthTokens>('/auth/refresh', { refreshToken }),

  logout: () => apiPost<void>('/auth/logout'),

  me: () => apiGet<User>('/auth/me'),

  changePassword: (payload: ChangePasswordPayload) => apiPatch<void>('/auth/me/password', payload),
}
