import { QueryClient } from '@tanstack/react-query'
import { toApiError } from '@/lib/error'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        const { statusCode } = toApiError(error)
        // Never retry a 4xx — it won't succeed on a second attempt.
        if (statusCode >= 400 && statusCode < 500) return false
        return failureCount < 1
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
})
