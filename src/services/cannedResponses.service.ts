import { apiDelete, apiGet, apiPatch, apiPost } from './api-client'
import type {
  CannedResponse,
  CreateCannedResponsePayload,
  UpdateCannedResponsePayload,
} from '@/types/canned-response.types'

export const cannedResponsesService = {
  list: () => apiGet<CannedResponse[]>('/canned-responses'),

  create: (payload: CreateCannedResponsePayload) =>
    apiPost<CannedResponse>('/canned-responses', payload),

  update: (id: string, payload: UpdateCannedResponsePayload) =>
    apiPatch<CannedResponse>(`/canned-responses/${id}`, payload),

  remove: (id: string) => apiDelete<void>(`/canned-responses/${id}`),
}
