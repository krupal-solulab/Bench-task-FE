import { apiGet, apiGetPaginated, apiPatch, apiPost } from './api-client'
import type {
  AddOrganizationAdminPayload,
  CreateOrganizationPayload,
  Organization,
  OrganizationDetail,
  OrganizationListQuery,
  OrganizationStatus,
  PlatformStats,
} from '@/types/organization.types'
import type { User } from '@/types/user.types'

export const organizationsService = {
  list: (query: OrganizationListQuery) =>
    apiGetPaginated<Organization>('/platform/organizations', query),

  getById: (id: string) => apiGet<OrganizationDetail>(`/platform/organizations/${id}`),

  create: (payload: CreateOrganizationPayload) =>
    apiPost<{ organization: Organization; admin: User }>('/platform/organizations', payload),

  rename: (id: string, name: string) =>
    apiPatch<Organization>(`/platform/organizations/${id}`, { name }),

  setStatus: (id: string, status: OrganizationStatus) =>
    apiPatch<Organization>(`/platform/organizations/${id}/status`, { status }),

  addAdmin: (id: string, payload: AddOrganizationAdminPayload) =>
    apiPost<User>(`/platform/organizations/${id}/admins`, payload),

  stats: () => apiGet<PlatformStats>('/platform/stats'),
}
