import { apiDelete, apiGet, apiPatch, apiPost } from './api-client'
import type {
  CreateIssueTemplatePayload,
  IssueTemplate,
  UpdateIssueTemplatePayload,
} from '@/types/issue-template.types'

export const issueTemplatesService = {
  list: (projectId?: string) =>
    apiGet<IssueTemplate[]>('/issue-templates', projectId ? { projectId } : undefined),

  create: (payload: CreateIssueTemplatePayload) =>
    apiPost<IssueTemplate>('/issue-templates', payload),

  update: (id: string, payload: UpdateIssueTemplatePayload) =>
    apiPatch<IssueTemplate>(`/issue-templates/${id}`, payload),

  remove: (id: string) => apiDelete<void>(`/issue-templates/${id}`),
}
