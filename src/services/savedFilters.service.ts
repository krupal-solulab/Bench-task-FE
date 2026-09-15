import { apiDelete, apiGet, apiPost } from './api-client'
import type {
  CreateSavedFilterPayload,
  ListSavedFiltersQuery,
  SavedFilter,
} from '@/types/saved-filter.types'

export const savedFiltersService = {
  list: (query: ListSavedFiltersQuery = {}) => apiGet<SavedFilter[]>('/saved-filters', query),

  create: (payload: CreateSavedFilterPayload) => apiPost<SavedFilter>('/saved-filters', payload),

  remove: (id: string) => apiDelete<void>(`/saved-filters/${id}`),
}
