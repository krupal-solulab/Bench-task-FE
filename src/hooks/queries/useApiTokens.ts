import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { apiTokensService } from '@/services/api-tokens.service'

export function useMyApiTokens() {
  return useQuery({
    queryKey: queryKeys.apiTokens.mine,
    queryFn: () => apiTokensService.listMine(),
  })
}

export function useOrgApiTokens() {
  return useQuery({
    queryKey: queryKeys.apiTokens.org,
    queryFn: () => apiTokensService.listOrg(),
  })
}
