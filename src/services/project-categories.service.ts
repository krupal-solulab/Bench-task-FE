import { apiDelete, apiGet, apiPatch, apiPost } from './api-client'
import type { ProjectCategory, ProjectCategoryPayload } from '@/types/project-category.types'

export const projectCategoriesService = {
  list: () => apiGet<ProjectCategory[]>('/project-categories'),

  create: (payload: ProjectCategoryPayload) =>
    apiPost<ProjectCategory>('/project-categories', payload),

  update: (id: string, payload: Partial<ProjectCategoryPayload>) =>
    apiPatch<ProjectCategory>(`/project-categories/${id}`, payload),

  remove: (id: string) => apiDelete<void>(`/project-categories/${id}`),
}
