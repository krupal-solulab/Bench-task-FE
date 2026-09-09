import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { apiLogsService } from '@/services/api-logs.service'
import type { ApiLogListQuery } from '@/types/api-log.types'

export function useApiLogs(query: ApiLogListQuery) {
  return useQuery({
    queryKey: queryKeys.platform.logs(query),
    queryFn: () => apiLogsService.list(query),
    placeholderData: (prev) => prev,
  })
}
