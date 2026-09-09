export const API_LOG_METHODS = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'] as const
export type ApiLogMethod = (typeof API_LOG_METHODS)[number]

export const API_LOG_STATUS_CLASSES = ['2xx', '3xx', '4xx', '5xx'] as const
export type ApiLogStatusClass = (typeof API_LOG_STATUS_CLASSES)[number]

export interface ApiLogOrganization {
  id: string
  name: string
  slug: string
}

export interface ApiLogEntry {
  id: string
  method: string
  path: string
  statusCode: number
  organization: ApiLogOrganization | null
  userId: string | null
  userEmail: string | null
  durationMs: number
  ip: string | null
  userAgent: string | null
  errorMessage: string | null
  createdAt: string
}

export interface ApiLogListQuery {
  page?: number
  limit?: number
  organizationId?: string
  method?: ApiLogMethod
  statusCode?: number
  statusClass?: ApiLogStatusClass
  path?: string
  dateFrom?: string
  dateTo?: string
}
