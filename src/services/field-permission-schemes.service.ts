import { apiDelete, apiGet, apiPatch, apiPost } from './api-client'
import type {
  CreateFieldPermissionSchemePayload,
  FieldPermissionScheme,
  UpdateFieldPermissionSchemePayload,
} from '@/types/field-permission-scheme.types'

export const fieldPermissionSchemesService = {
  list: () => apiGet<FieldPermissionScheme[]>('/field-permission-schemes'),

  create: (payload: CreateFieldPermissionSchemePayload) =>
    apiPost<FieldPermissionScheme>('/field-permission-schemes', payload),

  update: (id: string, payload: UpdateFieldPermissionSchemePayload) =>
    apiPatch<FieldPermissionScheme>(`/field-permission-schemes/${id}`, payload),

  remove: (id: string) => apiDelete<void>(`/field-permission-schemes/${id}`),
}
