import { apiDelete, apiGet, apiGetPaginated, apiPatch, apiPost } from './api-client'
import type {
  CreateWorkLogPayload,
  ProjectWorkLogListQuery,
  UpdateWorkLogPayload,
  WorkLog,
  WorkLogListQuery,
  WorkLogReport,
  WorkLogReportQuery,
  WorkLogSummary,
  WorkLogWithTask,
} from '@/types/worklog.types'

export const worklogsService = {
  listForTask: (taskId: string, query: WorkLogListQuery) =>
    apiGetPaginated<WorkLog>(`/tasks/${taskId}/worklogs`, query),

  create: (taskId: string, payload: CreateWorkLogPayload) =>
    apiPost<WorkLog>(`/tasks/${taskId}/worklogs`, payload),

  summaryForTask: (taskId: string) => apiGet<WorkLogSummary>(`/tasks/${taskId}/worklogs/summary`),

  update: (id: string, payload: UpdateWorkLogPayload) =>
    apiPatch<WorkLog>(`/worklogs/${id}`, payload),

  remove: (id: string) => apiDelete<void>(`/worklogs/${id}`),

  listForProject: (projectId: string, query: ProjectWorkLogListQuery) =>
    apiGetPaginated<WorkLogWithTask>(`/projects/${projectId}/worklogs`, query),

  reportForProject: (projectId: string, query: WorkLogReportQuery) =>
    apiGet<WorkLogReport>(`/projects/${projectId}/worklogs/report`, query),
}
