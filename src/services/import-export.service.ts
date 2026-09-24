import { apiGet, apiPost } from './api-client'
import type {
  CsvExportResult,
  ImportTasksPayload,
  ImportTasksResult,
  ProjectBackupResult,
} from '@/types/import-export.types'

export const importExportService = {
  exportTasksCsv: (projectId: string) =>
    apiGet<CsvExportResult>(`/projects/${projectId}/tasks/export`),

  importTasksCsv: (projectId: string, payload: ImportTasksPayload) =>
    apiPost<ImportTasksResult>(`/projects/${projectId}/tasks/import`, payload),

  backupProject: (projectId: string) =>
    apiGet<ProjectBackupResult>(`/projects/${projectId}/backup`),
}
