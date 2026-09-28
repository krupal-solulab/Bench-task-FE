import type { TaskPriority } from './task.types'

export interface IssueTemplate {
  id: string
  organizationId: string
  projectId: string | null
  createdBy: string
  name: string
  issueType: string
  titleTemplate: string
  description: string
  priority: TaskPriority | null
  labels: string[]
  customFieldValues: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface CreateIssueTemplatePayload {
  name: string
  projectId?: string | null
  issueType?: string
  titleTemplate?: string
  description?: string
  priority?: TaskPriority | null
  labels?: string[]
  customFieldValues?: Record<string, unknown>
}

export type UpdateIssueTemplatePayload = Partial<CreateIssueTemplatePayload>
