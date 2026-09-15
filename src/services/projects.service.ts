import { apiDelete, apiGet, apiGetPaginated, apiPatch, apiPost, apiPut } from './api-client'
import type {
  AutomationRule,
  CreateProjectPayload,
  CustomFieldDefinition,
  MemberPermissions,
  Project,
  ProjectActivityEntry,
  ProjectListQuery,
  ProjectMember,
  ProjectStats,
  UpdateProjectPayload,
} from '@/types/project.types'
import type { ProjectStatus } from '@/types/project.types'
import type { PageQuery } from '@/types/api.types'
import type { Task, TaskListQuery } from '@/types/task.types'
import { toTaskListParams } from './tasks.service'
import type { Workflow } from '@/types/workflow.types'

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

  getWorkflow: (id: string) => apiGet<Workflow>(`/projects/${id}/workflow`),

  updateWorkflow: (id: string, workflow: Workflow) =>
    apiPut<Workflow>(`/projects/${id}/workflow`, workflow),

  resetWorkflow: (id: string) => apiDelete<Workflow>(`/projects/${id}/workflow`),

  listLabels: (id: string) => apiGet<string[]>(`/projects/${id}/labels`),

  updateComponents: (id: string, names: string[]) =>
    apiPut<Project>(`/projects/${id}/components`, { names }),

  updateCustomFields: (id: string, fields: Array<Partial<CustomFieldDefinition>>) =>
    apiPut<Project>(`/projects/${id}/custom-fields`, { fields }),

  updateAutomationRules: (id: string, rules: Array<Partial<AutomationRule>>) =>
    apiPut<Project>(`/projects/${id}/automation-rules`, { rules }),
}
