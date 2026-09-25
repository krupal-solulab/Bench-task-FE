import { apiDelete, apiGet, apiGetPaginated, apiPatch, apiPost } from './api-client'
import type {
  CompleteSprintPayload,
  CreateSprintPayload,
  Sprint,
  SprintActivityEntry,
  SprintBurndownResult,
  SprintListQuery,
  SprintRetrospective,
  SprintVelocityEntry,
  UpdateSprintPayload,
} from '@/types/sprint.types'

export const sprintsService = {
  list: (projectId: string, query: SprintListQuery) =>
    apiGetPaginated<Sprint>(`/projects/${projectId}/sprints`, query),

  getActive: (projectId: string) => apiGet<Sprint | null>(`/projects/${projectId}/sprints/active`),

  get: (projectId: string, sprintId: string) =>
    apiGet<Sprint>(`/projects/${projectId}/sprints/${sprintId}`),

  create: (projectId: string, payload: CreateSprintPayload) =>
    apiPost<Sprint>(`/projects/${projectId}/sprints`, payload),

  update: (projectId: string, sprintId: string, payload: UpdateSprintPayload) =>
    apiPatch<Sprint>(`/projects/${projectId}/sprints/${sprintId}`, payload),

  start: (projectId: string, sprintId: string) =>
    apiPost<Sprint>(`/projects/${projectId}/sprints/${sprintId}/start`, {}),

  complete: (projectId: string, sprintId: string, payload: CompleteSprintPayload = {}) =>
    apiPost<Sprint>(`/projects/${projectId}/sprints/${sprintId}/complete`, payload),

  history: (projectId: string) => apiGet<Sprint[]>(`/projects/${projectId}/sprints/history`),

  remove: (projectId: string, sprintId: string) =>
    apiDelete<void>(`/projects/${projectId}/sprints/${sprintId}`),

  activity: (projectId: string, sprintId: string, query: { page?: number; limit?: number }) =>
    apiGetPaginated<SprintActivityEntry>(
      `/projects/${projectId}/sprints/${sprintId}/activity`,
      query,
    ),

  velocity: (projectId: string, limit?: number) =>
    apiGet<SprintVelocityEntry[]>(`/projects/${projectId}/sprints/velocity`, { limit }),

  burndown: (projectId: string, sprintId: string) =>
    apiGet<SprintBurndownResult>(`/projects/${projectId}/sprints/${sprintId}/burndown`),

  retrospective: (projectId: string, sprintId: string) =>
    apiGet<SprintRetrospective>(`/projects/${projectId}/sprints/${sprintId}/retrospective`),
}
