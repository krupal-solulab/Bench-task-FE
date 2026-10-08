import { apiDelete, apiGet, apiPatch, apiPost } from './api-client'
import type { CustomRole, CustomRolePayload } from '@/types/custom-role.types'

export const customRolesService = {
  list: () => apiGet<CustomRole[]>('/custom-roles'),
  create: (payload: CustomRolePayload) => apiPost<CustomRole>('/custom-roles', payload),
  update: (id: string, payload: Partial<CustomRolePayload>) =>
    apiPatch<CustomRole>(`/custom-roles/${id}`, payload),
  remove: (id: string) => apiDelete<void>(`/custom-roles/${id}`),
}
