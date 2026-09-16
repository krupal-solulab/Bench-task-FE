import { apiDelete, apiGet, apiPatch, apiPost } from './api-client'
import type {
  CreatePermissionSchemePayload,
  PermissionScheme,
  UpdatePermissionSchemePayload,
} from '@/types/permission-scheme.types'

export const permissionSchemesService = {
  list: () => apiGet<PermissionScheme[]>('/permission-schemes'),

  create: (payload: CreatePermissionSchemePayload) =>
    apiPost<PermissionScheme>('/permission-schemes', payload),

  update: (id: string, payload: UpdatePermissionSchemePayload) =>
    apiPatch<PermissionScheme>(`/permission-schemes/${id}`, payload),

  remove: (id: string) => apiDelete<void>(`/permission-schemes/${id}`),
}
