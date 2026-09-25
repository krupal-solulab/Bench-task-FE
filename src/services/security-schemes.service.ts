import { apiDelete, apiGet, apiPatch, apiPost } from './api-client'
import type {
  CreateSecuritySchemePayload,
  SecurityScheme,
  UpdateSecuritySchemePayload,
} from '@/types/security-scheme.types'

export const securitySchemesService = {
  list: () => apiGet<SecurityScheme[]>('/security-schemes'),

  create: (payload: CreateSecuritySchemePayload) =>
    apiPost<SecurityScheme>('/security-schemes', payload),

  update: (id: string, payload: UpdateSecuritySchemePayload) =>
    apiPatch<SecurityScheme>(`/security-schemes/${id}`, payload),

  remove: (id: string) => apiDelete<void>(`/security-schemes/${id}`),
}
