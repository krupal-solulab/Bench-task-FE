import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { organizationsService } from '@/services/organizations.service'
import type {
  AddOrganizationAdminPayload,
  CreateOrganizationPayload,
  OrganizationStatus,
} from '@/types/organization.types'

export function useCreateOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateOrganizationPayload) => organizationsService.create(payload),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all }),
  })
}

export function useRenameOrganization(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => organizationsService.rename(id, name),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all }),
  })
}

export function useSetOrganizationStatus(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (status: OrganizationStatus) => organizationsService.setStatus(id, status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all }),
  })
}

export function useAddOrganizationAdmin(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AddOrganizationAdminPayload) =>
      organizationsService.addAdmin(id, payload),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all }),
  })
}
