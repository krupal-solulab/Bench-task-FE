import { apiDelete, apiGet, apiPatch, apiPost } from './api-client'
import type {
  CreateProjectRolePayload,
  ProjectRole,
  UpdateProjectRolePayload,
} from '@/types/project-role.types'

export const projectRolesService = {
  list: () => apiGet<ProjectRole[]>('/project-roles'),

  create: (payload: CreateProjectRolePayload) => apiPost<ProjectRole>('/project-roles', payload),

  update: (id: string, payload: UpdateProjectRolePayload) =>
    apiPatch<ProjectRole>(`/project-roles/${id}`, payload),

  remove: (id: string) => apiDelete<void>(`/project-roles/${id}`),
}
