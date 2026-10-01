import { apiGetPaginated, apiPatch, apiPost } from './api-client'
import type {
  BulkUserResult,
  CreateUserPayload,
  Role,
  UpdateUserPayload,
  User,
  UserListQuery,
} from '@/types/user.types'

export const usersService = {
  list: (query: UserListQuery) => apiGetPaginated<User>('/users', query),

  assignable: () => apiGetPaginated<User>('/users/assignable', {}),

  create: (payload: CreateUserPayload) => apiPost<User>('/users', payload),

  update: (id: string, payload: UpdateUserPayload) => apiPatch<User>(`/users/${id}`, payload),

  updateRole: (id: string, role: Role) => apiPatch<User>(`/users/${id}/role`, { role }),

  updateStatus: (id: string, isActive: boolean) =>
    apiPatch<User>(`/users/${id}/status`, { isActive }),

  bulkUpdateRole: (userIds: string[], role: Role) =>
    apiPost<BulkUserResult>('/users/bulk/role', { userIds, role }),

  bulkUpdateStatus: (userIds: string[], isActive: boolean) =>
    apiPost<BulkUserResult>('/users/bulk/status', { userIds, isActive }),
}
