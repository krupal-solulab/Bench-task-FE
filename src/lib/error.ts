import axios from 'axios'
import type { ApiError, ApiErrorResponse } from '@/types/api.types'

const FRIENDLY_NETWORK_MESSAGE = 'Network error — please check your connection and try again.'
const FRIENDLY_TIMEOUT_MESSAGE = 'The request took too long to respond. Please try again.'
const FRIENDLY_FALLBACK_MESSAGE = 'Something went wrong. Please try again.'

function isAlreadyApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as ApiError).statusCode === 'number' &&
    typeof (error as ApiError).message === 'string'
  )
}

/**
 * Normalises any thrown error (Axios or otherwise) into a stable, user-facing shape.
 *
 * Idempotent: the api-client response interceptor already calls this on every rejection before
 * it ever reaches a component, so every catch block in the app that calls `toApiError(err)`
 * again (the standard pattern used throughout) is normalising an already-normalised value. Without
 * this early return, that second call would fail every `axios.isAxiosError`/`instanceof Error`
 * check (a plain `{ statusCode, message }` object is neither) and silently collapse into the
 * generic fallback message, discarding the real status code and message.
 */
export function toApiError(error: unknown): ApiError {
  if (isAlreadyApiError(error)) {
    return error
  }

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
