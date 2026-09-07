import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { usersService } from '@/services/users.service'
import type { UserListQuery } from '@/types/user.types'

export function useAssignableUsers() {
  return useQuery({
    queryKey: queryKeys.users.assignable,
    queryFn: () => usersService.assignable(),
  })
}

export function useUsers(query: UserListQuery) {
  return useQuery({
    queryKey: queryKeys.users.list(query),
    queryFn: () => usersService.list(query),
    placeholderData: (prev) => prev,
  })
}
