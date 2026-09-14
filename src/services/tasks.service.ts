import { apiDelete, apiGet, apiGetPaginated, apiPatch, apiPost } from './api-client'
import type {
  CreateTaskPayload,
  Task,
  TaskActivityEntry,
  TaskListQuery,
  UpdateTaskAssigneePayload,
  UpdateTaskPayload,
  UpdateTaskRankPayload,
  UpdateTaskSprintPayload,
  UpdateTaskStatusPayload,
} from '@/types/task.types'

export const tasksService = {
  list: (query: TaskListQuery) => apiGetPaginated<Task>('/tasks', query),

  overdue: (query: TaskListQuery) => apiGetPaginated<Task>('/tasks/overdue', query),

  myTasks: (query: TaskListQuery) => apiGetPaginated<Task>('/tasks/my-tasks', query),

  get: (id: string) => apiGet<Task>(`/tasks/${id}`),

  create: (payload: CreateTaskPayload) => apiPost<Task>('/tasks', payload),

  update: (id: string, payload: UpdateTaskPayload) => apiPatch<Task>(`/tasks/${id}`, payload),

  updateStatus: (id: string, payload: UpdateTaskStatusPayload) =>
    apiPatch<Task>(`/tasks/${id}/status`, payload),

  updateAssignee: (id: string, payload: UpdateTaskAssigneePayload) =>
    apiPatch<Task>(`/tasks/${id}/assignee`, payload),

  updateSprint: (id: string, payload: UpdateTaskSprintPayload) =>
    apiPatch<Task>(`/tasks/${id}/sprint`, payload),

  updateRank: (id: string, payload: UpdateTaskRankPayload) =>
    apiPatch<Task>(`/tasks/${id}/rank`, payload),

  remove: (id: string) => apiDelete<void>(`/tasks/${id}`),

  activity: (id: string, query: { page?: number; limit?: number }) =>
    apiGetPaginated<TaskActivityEntry>(`/tasks/${id}/activity`, query),
}
