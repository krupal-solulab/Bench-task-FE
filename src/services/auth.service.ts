import { apiGet, apiPatch, apiPost } from './api-client'
import type {
  AuthResponse,
  AuthTokens,
  ChangePasswordPayload,
  ImpersonationSession,
  LoginPayload,
  RegisterOrganizationPayload,
} from '@/types/auth.types'
import type { ProjectInvitePreview } from '@/types/project-invite.types'
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

  previewInvite: (token: string) => apiGet<ProjectInvitePreview>(`/auth/invites/${token}`),

  acceptInvite: (token: string, temporaryPassword: string) =>
    apiPost<AuthResponse>(`/auth/invites/${token}/accept`, { temporaryPassword }),

  /** Completes an invite account (own name + password) after signing in with the temporary one. */
  setInitialPassword: (name: string, newPassword: string) =>
    apiPost<AuthResponse>('/auth/me/initial-password', { name, newPassword }),

  impersonate: (userId: string) => apiPost<ImpersonationSession>(`/auth/impersonate/${userId}`),

  endImpersonation: () => apiPost<void>('/auth/impersonation/end'),
}
