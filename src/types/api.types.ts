export interface ApiSuccess<T> {
  success: true
  data: T
  message?: string
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface PaginatedResponse<T> {
  success: true
  data: T[]
  meta: PaginationMeta
}

export interface ApiErrorResponse {
  statusCode: number
  message: string
  error: string
  details?: string[]
  /** The 0-indexed character offset a JQL syntax error occurred at - see the backend's
   * JqlSyntaxError/AllExceptionsFilter. Absent for every other kind of error. */
  position?: number
  timestamp: string
  path: string
}

/** Normalised shape every thrown error is converted to by `lib/error.ts`. */
export interface ApiError {
  statusCode: number
  message: string
  details?: string[]
  position?: number
}

export type SortOrder = 'asc' | 'desc'

export interface PageQuery {
  page?: number
  limit?: number
}
