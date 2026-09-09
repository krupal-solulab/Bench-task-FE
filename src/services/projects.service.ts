import { apiDelete, apiGet, apiGetPaginated, apiPatch, apiPost } from './api-client'
import type {
  CreateProjectPayload,
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

  tasks: (id: string, query: TaskListQuery) =>
    apiGetPaginated<Task>(`/projects/${id}/tasks`, query),

  stats: (id: string) => apiGet<ProjectStats>(`/projects/${id}/stats`),

  activity: (id: string, query: { page?: number; limit?: number }) =>
    apiGetPaginated<ProjectActivityEntry>(`/projects/${id}/activity`, query),
}
