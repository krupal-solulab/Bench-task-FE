import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { usersService } from '@/services/users.service'
import type { CreateUserPayload, Role, UpdateUserPayload } from '@/types/user.types'

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => usersService.create(payload),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
  })
}

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateUserPayload) => usersService.update(id, payload),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
  })
}

export function useUpdateUserRole(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (role: Role) => usersService.updateRole(id, role),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
  })
}

export function useUpdateUserStatus(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (isActive: boolean) => usersService.updateStatus(id, isActive),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
  })
}
