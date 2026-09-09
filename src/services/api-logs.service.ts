import { apiGetPaginated } from './api-client'
import type { ApiLogEntry, ApiLogListQuery } from '@/types/api-log.types'

export const apiLogsService = {
  list: (query: ApiLogListQuery) => apiGetPaginated<ApiLogEntry>('/platform/logs', query),
}
