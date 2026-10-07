import { apiDelete, apiGet, apiPost } from './api-client'
import type {
  CreateProjectInvitePayload,
  ProjectInvite,
  SentProjectInvite,
} from '@/types/project-invite.types'

export const projectInvitesService = {
  list: (projectId: string) => apiGet<ProjectInvite[]>(`/projects/${projectId}/invites`),

  create: (projectId: string, payload: CreateProjectInvitePayload) =>
    apiPost<SentProjectInvite>(`/projects/${projectId}/invites`, payload),

  resend: (projectId: string, inviteId: string) =>
    apiPost<SentProjectInvite>(`/projects/${projectId}/invites/${inviteId}/resend`),

  revoke: (projectId: string, inviteId: string) =>
    apiDelete<ProjectInvite>(`/projects/${projectId}/invites/${inviteId}`),
}
