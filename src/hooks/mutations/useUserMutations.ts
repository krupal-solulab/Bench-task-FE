import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { usersService } from '@/services/users.service'
import type { CreateUserPayload, UpdateUserPayload, RoleChange } from '@/types/user.types'

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
    mutationFn: (change: RoleChange) => usersService.updateRole(id, change),
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

/** Module 8 gap-closure - bulk actions on the Admin Users page. */
export function useBulkUpdateUserRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userIds, change }: { userIds: string[]; change: RoleChange }) =>
      usersService.bulkUpdateRole(userIds, change),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
  })
}

export function useBulkUpdateUserStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userIds, isActive }: { userIds: string[]; isActive: boolean }) =>
      usersService.bulkUpdateStatus(userIds, isActive),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
  })
}
