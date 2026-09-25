import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { auditLogService } from '@/services/audit-log.service'
import type { AuditLogListQuery } from '@/types/audit-log.types'

export function useAuditLog(query: AuditLogListQuery) {
  return useQuery({
    queryKey: queryKeys.auditLog.list(query),
    queryFn: () => auditLogService.list(query),
    placeholderData: (prev) => prev,
  })
}
