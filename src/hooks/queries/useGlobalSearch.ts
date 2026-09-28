import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { searchService } from '@/services/search.service'
import type { GlobalSearchQuery } from '@/types/search.types'

/** Module 11's Global Search - `null` (query below the min length) skips the request entirely,
 * mirroring useTaskSearch's own null-to-skip convention. */
export function useGlobalSearch(query: GlobalSearchQuery | null) {
  return useQuery({
    queryKey: queryKeys.search.all(query),
    queryFn: () => searchService.searchAll(query!),
    enabled: !!query && query.q.trim().length >= 2,
  })
}
