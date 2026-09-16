import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { permissionSchemesService } from '@/services/permissionSchemes.service'
import type {
  CreatePermissionSchemePayload,
  UpdatePermissionSchemePayload,
} from '@/types/permission-scheme.types'

export function useCreatePermissionScheme() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreatePermissionSchemePayload) =>
      permissionSchemesService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.permissionSchemes.all })
    },
  })
}

export function useUpdatePermissionScheme(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdatePermissionSchemePayload) =>
      permissionSchemesService.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.permissionSchemes.all })
    },
  })
}

export function useDeletePermissionScheme() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => permissionSchemesService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.permissionSchemes.all })
    },
  })
}
