import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { securitySchemesService } from '@/services/security-schemes.service'
import type {
  CreateSecuritySchemePayload,
  UpdateSecuritySchemePayload,
} from '@/types/security-scheme.types'

export function useCreateSecurityScheme() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateSecuritySchemePayload) => securitySchemesService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.securitySchemes.all })
    },
  })
}

export function useUpdateSecurityScheme(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateSecuritySchemePayload) =>
      securitySchemesService.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.securitySchemes.all })
    },
  })
}

export function useDeleteSecurityScheme() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => securitySchemesService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.securitySchemes.all })
    },
  })
}
