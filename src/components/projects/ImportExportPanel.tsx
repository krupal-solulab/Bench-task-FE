import { useRef, useState } from 'react'
import { Button } from '@/components/common/Button'
import {
  useBackupProject,
  useDownloadBackupSnapshot,
  useExportTasksCsv,
  useImportTasksCsv,
} from '@/hooks/mutations/useImportExportMutations'
import { useProjectBackups } from '@/hooks/queries/useImportExport'
import { useToast } from '@/hooks/useToast'
import { downloadTextFile } from '@/lib/download'
import { formatDateTime } from '@/lib/date'
import { toApiError } from '@/lib/error'
import type { ImportTasksResult } from '@/types/import-export.types'

export interface ImportExportPanelProps {
  projectId: string
  canManage: boolean
}

/**
 * Module 5's CSV import/export + project backup. The backend returns file content as a JSON
 * string field, not a raw file response (see import-export.service.ts's comment), so this panel
 * builds the actual downloadable file client-side via `downloadTextFile`.
 */
export function ImportExportPanel({ projectId, canManage }: ImportExportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importResult, setImportResult] = useState<ImportTasksResult | null>(null)
  const exportCsv = useExportTasksCsv(projectId)
  const importCsv = useImportTasksCsv(projectId)
  const backup = useBackupProject(projectId)
  const downloadSnapshot = useDownloadBackupSnapshot(projectId)
  // The backups list route is Admin/Manager-only (assertUserCanManage, same as the manual backup
  // route) - skip fetching it for a viewer who'd just get a 403.
  const backupsQuery = useProjectBackups(canManage ? projectId : undefined)
  const { showToast } = useToast()

  async function handleExport() {
    try {
      const result = await exportCsv.mutateAsync()
      downloadTextFile(result.filename, result.csv, 'text/csv;charset=utf-8')
    } catch (err) {
      showToast({
        title: 'Could not export tasks',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImportResult(null)
    try {
      const csv = await file.text()
      const result = await importCsv.mutateAsync({ csv })
      setImportResult(result)
      if (result.failed.length > 0) {
        showToast({
          title: `Import: ${result.succeeded.length} succeeded, ${result.failed.length} failed`,
          variant: 'destructive',
        })
      } else {
        showToast({
          title: `Import: ${result.succeeded.length} task(s) created`,
          variant: 'success',
        })
      }
    } catch (err) {
      showToast({
        title: 'Could not import tasks',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleBackup() {
    try {
      const result = await backup.mutateAsync()
      downloadTextFile(
        result.filename,
        JSON.stringify(result.backup, null, 2),
        'application/json;charset=utf-8',
      )
    } catch (err) {
      showToast({
        title: 'Could not create backup',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleDownloadSnapshot(backupId: string) {
    try {
      const result = await downloadSnapshot.mutateAsync(backupId)
      downloadTextFile(
        result.filename,
        JSON.stringify(result.backup, null, 2),
        'application/json;charset=utf-8',
      )
    } catch (err) {
      showToast({
        title: 'Could not download backup',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-4 rounded-xl border bg-card p-5 shadow-soft">
      <div>
        <h3 className="font-medium">Import / Export</h3>
        <p className="text-sm text-muted-foreground">
          Export this project&apos;s tasks as CSV, bulk-import tasks from a CSV file, or download a
          configuration + issue snapshot backup.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          loading={exportCsv.isPending}
          onClick={() => void handleExport()}
        >
          Export CSV
        </Button>

        {canManage && (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              loading={importCsv.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              Import CSV
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => void handleFileChange(e)}
            />

            <Button
              type="button"
              size="sm"
              variant="outline"
              loading={backup.isPending}
              onClick={() => void handleBackup()}
            >
              Download backup
            </Button>
          </>
        )}
      </div>

      {importResult && (
        <div className="space-y-2 text-sm">
          <p>
            {importResult.succeeded.length} succeeded, {importResult.failed.length} failed
          </p>
          {importResult.failed.length > 0 && (
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border bg-muted/40 p-2 text-xs">
              {importResult.failed.map((failure) => (
                <li key={failure.row} className="text-destructive">
                  Row {failure.row}: {failure.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {canManage && (
        <div className="space-y-2 border-t pt-4">
          <h4 className="text-sm font-medium">Scheduled backups</h4>
          <p className="text-xs text-muted-foreground">
            A snapshot is taken automatically once a day, and every time you download a backup
            above.
          </p>
          {backupsQuery.data && backupsQuery.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No backups yet.</p>
          ) : (
            <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
              {(backupsQuery.data ?? []).map((snapshot) => (
                <li
                  key={snapshot.id}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5"
                >
                  <span>{formatDateTime(snapshot.createdAt)}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    loading={downloadSnapshot.isPending}
                    onClick={() => void handleDownloadSnapshot(snapshot.id)}
                  >
                    Download
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
