import { apiGet, apiPatch, apiPost } from './api-client'
import type {
  AuthResponse,
  AuthTokens,
  ChangePasswordPayload,
  ImpersonationSession,
  LoginPayload,
  RegisterOrganizationPayload,
} from '@/types/auth.types'
import type { UpdateUserPayload, User } from '@/types/user.types'

export const authService = {
  login: (payload: LoginPayload) => apiPost<AuthResponse>('/auth/login', payload),

  registerOrganization: (payload: RegisterOrganizationPayload) =>
    apiPost<AuthResponse>('/auth/register-organization', payload),

  refresh: (refreshToken: string) => apiPost<AuthTokens>('/auth/refresh', { refreshToken }),

  logout: () => apiPost<void>('/auth/logout'),

  me: () => apiGet<User>('/auth/me'),

  updateMe: (payload: UpdateUserPayload) => apiPatch<User>('/auth/me', payload),

  changePassword: (payload: ChangePasswordPayload) => apiPatch<void>('/auth/me/password', payload),

  impersonate: (userId: string) => apiPost<ImpersonationSession>(`/auth/impersonate/${userId}`),

  endImpersonation: () => apiPost<void>('/auth/impersonation/end'),
}
