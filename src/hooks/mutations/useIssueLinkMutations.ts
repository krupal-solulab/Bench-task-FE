import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { issueLinksService } from '@/services/issueLinks.service'
import type { CreateIssueLinkPayload, LinkTypeDraft } from '@/types/issue-link.types'

export function useCreateTaskLink(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateIssueLinkPayload) => issueLinksService.create(taskId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.planning.taskLinks(taskId) })
    },
  })
}

export function useDeleteTaskLink(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (linkId: string) => issueLinksService.remove(taskId, linkId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.planning.taskLinks(taskId) })
    },
  })
}

export function useUpdateLinkTypes() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (linkTypes: LinkTypeDraft[]) => issueLinksService.updateLinkTypes(linkTypes),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.planning.linkTypes })
    },
  })
}
