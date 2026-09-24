import { apiDelete, apiGet, apiGetPaginated, apiPatch, apiPost } from './api-client'
import type {
  BulkAssignPayload,
  BulkDeletePayload,
  BulkMoveSprintPayload,
  BulkOperationResult,
  BulkPriorityPayload,
  BulkRelabelPayload,
  BulkStatusPayload,
  CreateTaskPayload,
  EpicProgress,
  Task,
  TaskActivityEntry,
  TaskListQuery,
  TaskSearchQuery,
  UpdateTaskAssigneePayload,
  UpdateTaskPayload,
  UpdateTaskRankPayload,
  UpdateTaskSprintPayload,
  UpdateTaskStatusPayload,
} from '@/types/task.types'
import type { JqlAutocompleteFields } from '@/types/jql.types'

/** axios sends an array-of-objects query param as bracketed keys (`customFieldFilters[0][fieldId]`),
 * which the backend doesn't parse - it expects one JSON-encoded string, so this is built here
 * rather than relying on axios's default array/object serialization. */
export function toTaskListParams(query: TaskListQuery): Record<string, unknown> {
  return {
    ...query,
    customFieldFilters: query.customFieldFilters?.length
      ? JSON.stringify(query.customFieldFilters)
      : undefined,
  }
}

export const tasksService = {
  list: (query: TaskListQuery) => apiGetPaginated<Task>('/tasks', toTaskListParams(query)),

  overdue: (query: TaskListQuery) =>
    apiGetPaginated<Task>('/tasks/overdue', toTaskListParams(query)),

  myTasks: (query: TaskListQuery) =>
    apiGetPaginated<Task>('/tasks/my-tasks', toTaskListParams(query)),

  search: (query: TaskSearchQuery) => apiGetPaginated<Task>('/tasks/search', query),

  autocompleteFields: () => apiGet<JqlAutocompleteFields>('/tasks/search/autocomplete-fields'),

  autocompleteValues: (field: string) =>
    apiGet<string[]>('/tasks/search/autocomplete-values', { field }),

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

  bulkMoveSprint: (payload: BulkMoveSprintPayload) =>
    apiPatch<BulkOperationResult>('/tasks/bulk-move-sprint', payload),

  bulkAssign: (payload: BulkAssignPayload) =>
    apiPatch<BulkOperationResult>('/tasks/bulk-assign', payload),

  bulkRelabel: (payload: BulkRelabelPayload) =>
    apiPatch<BulkOperationResult>('/tasks/bulk-relabel', payload),

  bulkStatus: (payload: BulkStatusPayload) =>
    apiPatch<BulkOperationResult>('/tasks/bulk-status', payload),

  bulkPriority: (payload: BulkPriorityPayload) =>
    apiPatch<BulkOperationResult>('/tasks/bulk-priority', payload),

  bulkDelete: (payload: BulkDeletePayload) =>
    apiPatch<BulkOperationResult>('/tasks/bulk-delete', payload),

  remove: (id: string) => apiDelete<void>(`/tasks/${id}`),

  activity: (id: string, query: { page?: number; limit?: number }) =>
    apiGetPaginated<TaskActivityEntry>(`/tasks/${id}/activity`, query),

  epicProgress: (id: string) => apiGet<EpicProgress>(`/tasks/${id}/epic-progress`),
}
