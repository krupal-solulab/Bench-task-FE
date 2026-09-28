import { apiGet } from './api-client'
import type { GlobalSearchQuery, GlobalSearchResult } from '@/types/search.types'

export const searchService = {
  searchAll: (query: GlobalSearchQuery) => apiGet<GlobalSearchResult>('/search', query),
}
