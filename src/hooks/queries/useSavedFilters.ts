import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { savedFiltersService } from '@/services/savedFilters.service'
import type { ListSavedFiltersQuery } from '@/types/saved-filter.types'

export function useSavedFilters(query: ListSavedFiltersQuery) {
  return useQuery({
    queryKey: queryKeys.savedFilters.list(query),
    queryFn: () => savedFiltersService.list(query),
  })
}
