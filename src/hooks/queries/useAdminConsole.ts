import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { adminConsoleService } from '@/services/admin-console.service'

export function useAdminSystemStats() {
  return useQuery({
    queryKey: queryKeys.adminConsole.stats,
    queryFn: () => adminConsoleService.stats(),
  })
}
