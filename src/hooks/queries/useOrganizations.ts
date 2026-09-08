import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { organizationsService } from '@/services/organizations.service'
import type { OrganizationListQuery } from '@/types/organization.types'

export function useOrganizations(query: OrganizationListQuery) {
  return useQuery({
    queryKey: queryKeys.organizations.list(query),
    queryFn: () => organizationsService.list(query),
    placeholderData: (prev) => prev,
  })
}

export function useOrganization(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.organizations.detail(id ?? ''),
    queryFn: () => organizationsService.getById(id!),
    enabled: !!id,
  })
}

export function usePlatformStats() {
  return useQuery({
    queryKey: queryKeys.platform.stats,
    queryFn: () => organizationsService.stats(),
  })
}
