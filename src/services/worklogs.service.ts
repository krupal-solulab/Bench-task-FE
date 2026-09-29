import { apiDelete, apiGet, apiGetPaginated, apiPatch, apiPost } from './api-client'
import type { CsvExportResult } from '@/types/import-export.types'
import type {
  CreateWorkLogPayload,
  MyTimesheetQuery,
  MyTimesheetReport,
  ProjectWorkLogListQuery,
  UpdateWorkLogPayload,
  WorkLog,
  WorkLogCorrelationReport,
  WorkLogListQuery,
  WorkLogReport,
  WorkLogReportQuery,
  WorkLogSprintReport,
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

  correlationForProject: (projectId: string) =>
    apiGet<WorkLogCorrelationReport>(`/projects/${projectId}/worklogs/correlation`),

  reportForSprint: (projectId: string, sprintId: string) =>
    apiGet<WorkLogSprintReport>(`/projects/${projectId}/sprints/${sprintId}/worklogs/report`),

  exportProjectCsv: (projectId: string, query: WorkLogReportQuery) =>
    apiGet<CsvExportResult>(`/projects/${projectId}/worklogs/export`, query),

  myTimesheet: (query: MyTimesheetQuery) =>
    apiGet<MyTimesheetReport>('/worklogs/my-timesheet', query),
}
