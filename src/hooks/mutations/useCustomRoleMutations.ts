import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { customRolesService } from '@/services/custom-roles.service'
import type { CustomRolePayload } from '@/types/custom-role.types'

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.customRoles.all })
    // Changing a role's access level moves its holders - user lists show the new role.
    void queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
  }
}

export function useCreateCustomRole() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (payload: CustomRolePayload) => customRolesService.create(payload),
    onSuccess: invalidate,
  })
}

export function useUpdateCustomRole() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CustomRolePayload> }) =>
      customRolesService.update(id, payload),
    onSuccess: invalidate,
  })
}

export function useDeleteCustomRole() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => customRolesService.remove(id),
    onSuccess: invalidate,
  })
}
