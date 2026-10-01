import { apiDelete, apiGet, apiPatch, apiPost } from './api-client'
import type { Project } from '@/types/project.types'
import type {
  CreateLibraryFieldPayload,
  CustomFieldLibraryEntry,
  UpdateLibraryFieldPayload,
} from '@/types/custom-field-library.types'

export const customFieldLibraryService = {
  list: () => apiGet<CustomFieldLibraryEntry[]>('/custom-field-library'),

  create: (payload: CreateLibraryFieldPayload) =>
    apiPost<CustomFieldLibraryEntry>('/custom-field-library', payload),

  update: (id: string, payload: UpdateLibraryFieldPayload) =>
    apiPatch<CustomFieldLibraryEntry>(`/custom-field-library/${id}`, payload),

  remove: (id: string) => apiDelete<void>(`/custom-field-library/${id}`),

  adopt: (projectId: string, entryId: string, required: boolean) =>
    apiPost<Project>(`/projects/${projectId}/custom-fields/library/${entryId}`, { required }),
}
