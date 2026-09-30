import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { importExportService } from '@/services/import-export.service'
import type { ImportTasksPayload } from '@/types/import-export.types'

/** Module 5's CSV export/backup are read-only GETs, invoked on demand from a button click rather
 * than rendered data - a mutation (not a query) fits better here, since there's nothing to cache
 * or keep fresh, only a one-shot "fetch it now, then hand it to the download helper" action. */
export function useExportTasksCsv(projectId: string) {
  return useMutation({
    mutationFn: () => importExportService.exportTasksCsv(projectId),
  })
}

export function useImportTasksCsv(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ImportTasksPayload) =>
      importExportService.importTasksCsv(projectId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) })
    },
  })
}

export function useBackupProject(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => importExportService.backupProject(projectId),
    // Module 5 gap-closure: a manual backup also persists a snapshot server-side, so the listed
    // history should reflect it immediately rather than waiting for the list's own staleness.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.backups(projectId) })
    },
  })
}

/** Module 5 gap-closure: fetches one previously-listed backup's full content on demand, so it can
 * be handed to the same client-side download helper the manual "Download backup" button uses. */
export function useDownloadBackupSnapshot(projectId: string) {
  return useMutation({
    mutationFn: (backupId: string) => importExportService.getBackup(projectId, backupId),
  })
}
