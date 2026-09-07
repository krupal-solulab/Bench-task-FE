import axios from 'axios'
import type { ApiError, ApiErrorResponse } from '@/types/api.types'

const FRIENDLY_NETWORK_MESSAGE = 'Network error — please check your connection and try again.'
const FRIENDLY_TIMEOUT_MESSAGE = 'The request took too long to respond. Please try again.'
const FRIENDLY_FALLBACK_MESSAGE = 'Something went wrong. Please try again.'

/** Normalises any thrown error (Axios or otherwise) into a stable, user-facing shape. */
export function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    if (error.code === 'ECONNABORTED') {
      return { statusCode: 0, message: FRIENDLY_TIMEOUT_MESSAGE }
    }
    if (!error.response) {
      return { statusCode: 0, message: FRIENDLY_NETWORK_MESSAGE }
    }
    const body = error.response.data
    return {
      statusCode: error.response.status,
      message: body?.message || FRIENDLY_FALLBACK_MESSAGE,
      details: body?.details,
    }
  }

  if (error instanceof Error) {
    return { statusCode: 0, message: error.message || FRIENDLY_FALLBACK_MESSAGE }
  }

  return { statusCode: 0, message: FRIENDLY_FALLBACK_MESSAGE }
}

export function isForbiddenError(error: unknown): boolean {
  return toApiError(error).statusCode === 403
}

export function isUnauthorizedError(error: unknown): boolean {
  return toApiError(error).statusCode === 401
}

export function isNotFoundError(error: unknown): boolean {
  return toApiError(error).statusCode === 404
}

export function isConflictError(error: unknown): boolean {
  return toApiError(error).statusCode === 409
}
