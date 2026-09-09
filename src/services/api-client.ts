import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { toApiError } from '@/lib/error'
import type {
  ApiErrorResponse,
  ApiSuccess,
  PaginatedResponse,
  PaginationMeta,
} from '@/types/api.types'
import type { AuthTokens } from '@/types/auth.types'

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean
  }
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
    // Free ngrok tunnels serve an HTML browser-warning interstitial (no CORS headers at all) to
    // real browser requests, which the app would otherwise see as a CORS failure. This header is
    // ngrok's documented bypass; it's a no-op against any non-ngrok backend.
    'ngrok-skip-browser-warning': 'true',
  },
})

/**
 * The access token is held in memory only (see AuthContext) — the client never reads/writes
 * localStorage for it. `setAccessToken` is called by AuthContext on login/refresh/logout.
 */
let accessToken: string | null = null
export function setAccessToken(token: string | null): void {
  accessToken = token
}

type UnauthorizedHandler = () => void
let onUnauthorized: UnauthorizedHandler | null = null
/** AuthContext registers a callback that clears the session and redirects to /login. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler
}

type RefreshFn = () => Promise<AuthTokens>
let refreshFn: RefreshFn | null = null
/** AuthContext registers the function that actually calls POST /auth/refresh. */
export function setRefreshHandler(handler: RefreshFn | null): void {
  refreshFn = handler
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`)
  }
  return config
})

let isRefreshing = false
let pendingQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

function flushQueue(error: unknown, token: string | null) {
  for (const request of pendingQueue) {
    if (token) request.resolve(token)
    else request.reject(error)
  }
  pendingQueue = []
}

apiClient.interceptors.response.use(
  (response) => {
    // Unwrap the envelope: services receive `data` directly, or `{ data, meta }` when paginated.
    const body = response.data as ApiSuccess<unknown> | PaginatedResponse<unknown> | undefined
    if (body && typeof body === 'object' && 'data' in body) {
      const unwrapped = 'meta' in body ? { data: body.data, meta: body.meta } : body.data
      return { ...response, data: unwrapped }
    }
    return response
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config

    if (error.response?.status === 403) {
      // Let the calling hook decide whether to render ForbiddenPage; we only surface the toast.
      window.dispatchEvent(new CustomEvent('api:forbidden', { detail: toApiError(error) }))
      return Promise.reject(toApiError(error))
    }

    const isAuthEndpoint = originalRequest?.url?.includes('/auth/refresh')
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      if (!refreshFn) {
        onUnauthorized?.()
        return Promise.reject(toApiError(error))
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (token) => {
              originalRequest._retry = true
              originalRequest.headers.set('Authorization', `Bearer ${token}`)
              resolve(apiClient(originalRequest))
            },
            reject,
          })
        })
      }

      isRefreshing = true
      originalRequest._retry = true
      try {
        const tokens = await refreshFn()
        setAccessToken(tokens.accessToken)
        flushQueue(null, tokens.accessToken)
        originalRequest.headers.set('Authorization', `Bearer ${tokens.accessToken}`)
        return apiClient(originalRequest)
      } catch (refreshError) {
        flushQueue(refreshError, null)
        onUnauthorized?.()
        return Promise.reject(toApiError(refreshError))
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(toApiError(error))
  },
)

export interface Paginated<T> {
  data: T[]
  meta: PaginationMeta
}

export async function apiGet<T>(url: string, params?: object): Promise<T> {
  const response = await apiClient.get<T>(url, { params })
  return response.data
}

export async function apiGetPaginated<T>(url: string, params?: object): Promise<Paginated<T>> {
  const response = await apiClient.get<Paginated<T>>(url, { params })
  return response.data
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const response = await apiClient.post<T>(url, body)
  return response.data
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const response = await apiClient.patch<T>(url, body)
  return response.data
}

export async function apiDelete<T>(url: string, params?: object): Promise<T> {
  const response = await apiClient.delete<T>(url, { params })
  return response.data
}

export async function apiUpload<T>(url: string, formData: FormData): Promise<T> {
  const response = await apiClient.post<T>(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}
