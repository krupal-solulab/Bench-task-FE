import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { integrationHealthService } from '@/services/integration-health.service'

export function useIntegrationHealth() {
  return useQuery({
    queryKey: queryKeys.platform.integrationHealth,
    queryFn: () => integrationHealthService.check(),
  })
}
