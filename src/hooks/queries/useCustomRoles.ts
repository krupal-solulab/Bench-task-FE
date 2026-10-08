import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { customRolesService } from '@/services/custom-roles.service'

/** The organization's custom roles - shared by every badge and role picker (one fetch). */
export function useCustomRoles(enabled = true) {
  return useQuery({
    queryKey: queryKeys.customRoles.all,
    queryFn: customRolesService.list,
    staleTime: 5 * 60_000,
    enabled,
  })
}
