import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { cannedResponsesService } from '@/services/cannedResponses.service'
import type {
  CreateCannedResponsePayload,
  UpdateCannedResponsePayload,
} from '@/types/canned-response.types'

export function useCreateCannedResponse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateCannedResponsePayload) => cannedResponsesService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cannedResponses.all })
    },
  })
}

export function useUpdateCannedResponse(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateCannedResponsePayload) =>
      cannedResponsesService.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cannedResponses.all })
    },
  })
}

export function useDeleteCannedResponse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cannedResponsesService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cannedResponses.all })
    },
  })
}
