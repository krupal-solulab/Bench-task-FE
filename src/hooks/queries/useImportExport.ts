import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { importExportService } from '@/services/import-export.service'

/** Module 5 gap-closure: a project's scheduled-backup history - unlike CSV export/manual backup
 * (one-shot mutations, nothing to cache), this list IS data worth keeping fresh, so it's a query. */
export function useProjectBackups(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.backups(projectId ?? ''),
    queryFn: () => importExportService.listBackups(projectId!),
    enabled: !!projectId,
  })
}
