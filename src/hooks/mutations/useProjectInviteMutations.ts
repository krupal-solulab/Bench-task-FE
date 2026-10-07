import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { projectInvitesService } from '@/services/project-invites.service'
import type { CreateProjectInvitePayload } from '@/types/project-invite.types'

function useInvalidateInvites(projectId: string) {
  const queryClient = useQueryClient()
  return () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.projects.invites(projectId) })
}

export function useCreateProjectInvite(projectId: string) {
  const invalidate = useInvalidateInvites(projectId)
  return useMutation({
    mutationFn: (payload: CreateProjectInvitePayload) =>
      projectInvitesService.create(projectId, payload),
    onSuccess: invalidate,
  })
}

export function useResendProjectInvite(projectId: string) {
  const invalidate = useInvalidateInvites(projectId)
  return useMutation({
    mutationFn: (inviteId: string) => projectInvitesService.resend(projectId, inviteId),
    onSuccess: invalidate,
  })
}

export function useRevokeProjectInvite(projectId: string) {
  const invalidate = useInvalidateInvites(projectId)
  return useMutation({
    mutationFn: (inviteId: string) => projectInvitesService.revoke(projectId, inviteId),
    onSuccess: invalidate,
  })
}
