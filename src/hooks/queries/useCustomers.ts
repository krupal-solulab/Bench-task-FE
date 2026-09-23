import { useQuery } from '@tanstack/react-query'
import { QUERY_STALE_TIME, queryKeys } from '@/lib/constants'
import { customersService } from '@/services/customers.service'

export function useCustomers(query: { page: number; limit: number; search?: string }) {
  return useQuery({
    queryKey: queryKeys.customers.list(query),
    queryFn: () => customersService.list(query),
    staleTime: QUERY_STALE_TIME.list,
    placeholderData: (prev) => prev,
  })
}
