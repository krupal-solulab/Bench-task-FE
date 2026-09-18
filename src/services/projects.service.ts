import { apiDelete, apiGet, apiGetPaginated, apiPatch, apiPost, apiPut } from './api-client'
import type {
  AutomationRule,
  CreateProjectPayload,
  CustomFieldDefinition,
  CustomFieldOverrideByType,
  MemberPermissions,
  Project,
  ProjectActivityEntry,
  ProjectListQuery,
  ProjectMember,
  ProjectStats,
  UpdateProjectPayload,
} from '@/types/project.types'
import type { ProjectStatus } from '@/types/project.types'
import type { IssueTypeDefinition } from '@/types/issue-type.types'
import type { PageQuery } from '@/types/api.types'
import type { Task, TaskListQuery } from '@/types/task.types'
import { toTaskListParams } from './tasks.service'
import type { Workflow } from '@/types/workflow.types'
import type { NotificationSchemeRule } from '@/types/notification-scheme.types'

export const projectsService = {
  list: (query: ProjectListQuery) => apiGetPaginated<Project>('/projects', query),

  get: (id: string) => apiGet<Project>(`/projects/${id}`),

  create: (payload: CreateProjectPayload) => apiPost<Project>('/projects', payload),

  update: (id: string, payload: UpdateProjectPayload) =>
    apiPatch<Project>(`/projects/${id}`, payload),

  updateStatus: (id: string, status: ProjectStatus) =>
    apiPatch<Project>(`/projects/${id}/status`, { status }),

  remove: (id: string) => apiDelete<void>(`/projects/${id}`),

  members: (id: string, query: PageQuery = {}) =>
    apiGetPaginated<ProjectMember>(`/projects/${id}/members`, query),

  addMembers: (id: string, userIds: string[]) =>
    apiPost<Project>(`/projects/${id}/members`, { userIds }),

  removeMember: (id: string, userId: string, reassignTo?: string) =>
    apiDelete<Project>(`/projects/${id}/members/${userId}`, reassignTo ? { reassignTo } : {}),

  setMemberPermissions: (id: string, userId: string, patch: Partial<MemberPermissions>) =>
    apiPatch<Project>(`/projects/${id}/members/${userId}/permissions`, patch),

  tasks: (id: string, query: TaskListQuery) =>
    apiGetPaginated<Task>(`/projects/${id}/tasks`, toTaskListParams(query)),

  stats: (id: string) => apiGet<ProjectStats>(`/projects/${id}/stats`),

  activity: (id: string, query: { page?: number; limit?: number }) =>
    apiGetPaginated<ProjectActivityEntry>(`/projects/${id}/activity`, query),

  getWorkflow: (id: string, issueType?: string) =>
    apiGet<Workflow>(`/projects/${id}/workflow`, issueType ? { issueType } : undefined),

  updateWorkflow: (id: string, workflow: Workflow, issueType?: string) =>
    apiPut<Workflow>(
      `/projects/${id}/workflow${issueType ? `?issueType=${encodeURIComponent(issueType)}` : ''}`,
      workflow,
    ),

  resetWorkflow: (id: string, issueType?: string) =>
    apiDelete<Workflow>(`/projects/${id}/workflow`, issueType ? { issueType } : undefined),

  listLabels: (id: string) => apiGet<string[]>(`/projects/${id}/labels`),

  updateComponents: (id: string, names: string[]) =>
    apiPut<Project>(`/projects/${id}/components`, { names }),

  updateCustomFields: (id: string, fields: Array<Partial<CustomFieldDefinition>>) =>
    apiPut<Project>(`/projects/${id}/custom-fields`, { fields }),

  getEffectiveCustomFields: (id: string, issueType?: string) =>
    apiGet<CustomFieldDefinition[]>(
      `/projects/${id}/custom-fields/effective`,
      issueType ? { issueType } : undefined,
    ),

  getCustomFieldOverride: (id: string, issueType: string) =>
    apiGet<CustomFieldOverrideByType>(`/projects/${id}/custom-field-overrides`, { issueType }),

  updateCustomFieldOverride: (
    id: string,
    issueType: string,
    override: Partial<Omit<CustomFieldOverrideByType, 'issueType'>>,
  ) =>
    apiPut<CustomFieldOverrideByType>(
      `/projects/${id}/custom-field-overrides?issueType=${encodeURIComponent(issueType)}`,
      override,
    ),

  resetCustomFieldOverride: (id: string, issueType: string) =>
    apiDelete<CustomFieldOverrideByType>(`/projects/${id}/custom-field-overrides`, { issueType }),

  updateAutomationRules: (id: string, rules: Array<Partial<AutomationRule>>) =>
    apiPut<Project>(`/projects/${id}/automation-rules`, { rules }),

  updateIssueTypes: (id: string, issueTypes: IssueTypeDefinition[]) =>
    apiPut<Project>(`/projects/${id}/issue-types`, { issueTypes }),

  assignPermissionScheme: (id: string, permissionSchemeId: string | null) =>
    apiPatch<Project>(`/projects/${id}/permission-scheme`, { permissionSchemeId }),

  updateNotificationScheme: (id: string, rules: NotificationSchemeRule[]) =>
    apiPut<Project>(`/projects/${id}/notification-scheme`, { rules }),
}
