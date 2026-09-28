import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { fieldPermissionSchemesService } from '@/services/field-permission-schemes.service'
import type {
  CreateFieldPermissionSchemePayload,
  UpdateFieldPermissionSchemePayload,
} from '@/types/field-permission-scheme.types'

export function useCreateFieldPermissionScheme() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateFieldPermissionSchemePayload) =>
      fieldPermissionSchemesService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.fieldPermissionSchemes.all })
    },
  })
}

export function useUpdateFieldPermissionScheme(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateFieldPermissionSchemePayload) =>
      fieldPermissionSchemesService.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.fieldPermissionSchemes.all })
    },
  })
}

export function useDeleteFieldPermissionScheme() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => fieldPermissionSchemesService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.fieldPermissionSchemes.all })
    },
  })
}
