import { apiDelete, apiGet, apiPost, apiPut } from './api-client'
import type {
  CreateIssueLinkPayload,
  IssueLink,
  LinkType,
  LinkTypeDraft,
} from '@/types/issue-link.types'

export const issueLinksService = {
  list: (taskId: string) => apiGet<IssueLink[]>(`/tasks/${taskId}/links`),

  create: (taskId: string, payload: CreateIssueLinkPayload) =>
    apiPost<IssueLink>(`/tasks/${taskId}/links`, payload),

  remove: (taskId: string, linkId: string) => apiDelete<void>(`/tasks/${taskId}/links/${linkId}`),

  linkTypes: () => apiGet<LinkType[]>('/link-types'),

  updateLinkTypes: (linkTypes: LinkTypeDraft[]) => apiPut<LinkType[]>('/link-types', { linkTypes }),
}
