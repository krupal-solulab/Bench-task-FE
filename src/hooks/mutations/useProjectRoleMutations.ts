import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { projectRolesService } from '@/services/project-roles.service'
import type { CreateProjectRolePayload, UpdateProjectRolePayload } from '@/types/project-role.types'

export function useCreateProjectRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateProjectRolePayload) => projectRolesService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projectRoles.all })
    },
  })
}

export function useUpdateProjectRole(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateProjectRolePayload) => projectRolesService.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projectRoles.all })
    },
  })
}

export function useDeleteProjectRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => projectRolesService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projectRoles.all })
    },
  })
}
