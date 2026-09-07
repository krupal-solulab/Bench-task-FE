import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import { useQueryParams } from './useQueryParams'

export function usePagination() {
  const [{ page, limit }, setParams] = useQueryParams({ page: 1, limit: DEFAULT_PAGE_SIZE })

  const setPage = (nextPage: number) => setParams({ page: nextPage })
  const setLimit = (nextLimit: number) => setParams({ limit: nextLimit, page: 1 })

  return { page, limit, setPage, setLimit }
}
