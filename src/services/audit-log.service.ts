import { apiGetPaginated } from './api-client'
import type { AuditLogEntry, AuditLogListQuery } from '@/types/audit-log.types'

export const auditLogService = {
  list: (query: AuditLogListQuery) => apiGetPaginated<AuditLogEntry>('/audit-log', query),
}
