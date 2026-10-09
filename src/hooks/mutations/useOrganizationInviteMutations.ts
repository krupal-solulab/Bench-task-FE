import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { organizationInvitesService } from '@/services/organization-invites.service'
import type { CreateOrganizationInvitePayload } from '@/types/project-invite.types'

function useInvalidateOrganizationInvites() {
  const queryClient = useQueryClient()
  return () => void queryClient.invalidateQueries({ queryKey: queryKeys.organizationInvites.all })
}

export function useCreateOrganizationInvite() {
  const invalidate = useInvalidateOrganizationInvites()
  return useMutation({
    mutationFn: (payload: CreateOrganizationInvitePayload) =>
      organizationInvitesService.create(payload),
    onSuccess: invalidate,
  })
}

export function useResendOrganizationInvite() {
  const invalidate = useInvalidateOrganizationInvites()
  return useMutation({
    mutationFn: (inviteId: string) => organizationInvitesService.resend(inviteId),
    onSuccess: invalidate,
  })
}

export function useRevokeOrganizationInvite() {
  const invalidate = useInvalidateOrganizationInvites()
  return useMutation({
    mutationFn: (inviteId: string) => organizationInvitesService.revoke(inviteId),
    onSuccess: invalidate,
  })
}
