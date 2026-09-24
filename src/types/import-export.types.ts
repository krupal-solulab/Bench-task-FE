/** Module 5's CSV export/import + project backup - `csv`/`backup` travel as JSON fields (not a
 * raw file response, see the backend's import-export.service.ts), so the frontend builds the
 * actual downloadable file client-side (see lib/download.ts). */
export interface CsvExportResult {
  filename: string
  csv: string
}

export interface ImportTasksPayload {
  csv: string
}

export interface ImportRowSuccess {
  row: number
  issueKey: string | null
  taskId: string
}

export interface ImportRowFailure {
  row: number
  message: string
}

export interface ImportTasksResult {
  succeeded: ImportRowSuccess[]
  failed: ImportRowFailure[]
}

/** Deliberately loose - this is a passthrough download, not a shape the frontend reads fields
 * out of, so it isn't worth mirroring the backend's full ProjectBackup interface field-for-field. */
export interface ProjectBackupResult {
  filename: string
  backup: Record<string, unknown>
}
