import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { securitySchemesService } from '@/services/security-schemes.service'

export function useSecuritySchemes() {
  return useQuery({
    queryKey: queryKeys.securitySchemes.all,
    queryFn: () => securitySchemesService.list(),
  })
}
