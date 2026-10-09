import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { organizationInvitesService } from '@/services/organization-invites.service'

export function useOrganizationInvites(enabled = true) {
  return useQuery({
    queryKey: queryKeys.organizationInvites.all,
    queryFn: () => organizationInvitesService.list(),
    enabled,
  })
}
