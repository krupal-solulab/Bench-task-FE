import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { apiTokensService } from '@/services/api-tokens.service'
import type { CreateApiTokenPayload } from '@/types/api-token.types'

function useInvalidateApiTokens() {
  const queryClient = useQueryClient()
  return () => void queryClient.invalidateQueries({ queryKey: queryKeys.apiTokens.all })
}

export function useCreateApiToken() {
  const invalidate = useInvalidateApiTokens()
  return useMutation({
    mutationFn: (payload: CreateApiTokenPayload) => apiTokensService.create(payload),
    onSuccess: invalidate,
  })
}

/** Revokes one of my tokens - or, with `asAdmin`, anyone's token in the org. */
export function useRevokeApiToken(asAdmin = false) {
  const invalidate = useInvalidateApiTokens()
  return useMutation({
    mutationFn: (id: string) =>
      asAdmin ? apiTokensService.revokeAny(id) : apiTokensService.revoke(id),
    onSuccess: invalidate,
  })
}
