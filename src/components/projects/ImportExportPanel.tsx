import { useRef, useState } from 'react'
import { Button } from '@/components/common/Button'
import {
  useBackupProject,
  useExportTasksCsv,
  useImportTasksCsv,
} from '@/hooks/mutations/useImportExportMutations'
import { useToast } from '@/hooks/useToast'
import { downloadTextFile } from '@/lib/download'
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
    </div>
  )
}
