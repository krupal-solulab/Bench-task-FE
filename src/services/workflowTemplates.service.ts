import { apiDelete, apiGet, apiPatch, apiPost } from './api-client'
import type { WorkflowTemplate } from '@/types/workflow-template.types'
import type { Workflow } from '@/types/workflow.types'

export interface WorkflowTemplatePayload {
  name: string
  description?: string
  workflow: Workflow
}

export const workflowTemplatesService = {
  list: () => apiGet<WorkflowTemplate[]>('/workflow-templates'),

  create: (payload: WorkflowTemplatePayload) =>
    apiPost<WorkflowTemplate>('/workflow-templates', payload),

  update: (id: string, payload: Partial<WorkflowTemplatePayload>) =>
    apiPatch<WorkflowTemplate>(`/workflow-templates/${id}`, payload),

  remove: (id: string) => apiDelete<void>(`/workflow-templates/${id}`),
}
