import { apiDelete, apiGet, apiPost } from './api-client'
import type {
  CreateOrganizationInvitePayload,
  ProjectInvite,
  SentProjectInvite,
} from '@/types/project-invite.types'

/** Admin > Users: invitations to the organization itself (no project). */
export const organizationInvitesService = {
  list: () => apiGet<ProjectInvite[]>('/organization-invites'),

  create: (payload: CreateOrganizationInvitePayload) =>
    apiPost<SentProjectInvite>('/organization-invites', payload),

  resend: (inviteId: string) =>
    apiPost<SentProjectInvite>(`/organization-invites/${inviteId}/resend`),

  revoke: (inviteId: string) => apiDelete<ProjectInvite>(`/organization-invites/${inviteId}`),
}
