import { useMutation } from '@tanstack/react-query'
import { authService } from '@/services/auth.service'
import type { ChangePasswordPayload } from '@/types/auth.types'
import type { UpdateUserPayload } from '@/types/user.types'

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => authService.changePassword(payload),
  })
}

/** Module 11's self-service profile editing. Deliberately doesn't touch AuthContext itself -
 * the caller applies the returned user via `useAuth().updateUser` on success, keeping this hook a
 * plain API mutation like every other one in this file. */
export function useUpdateProfile() {
  return useMutation({
    mutationFn: (payload: UpdateUserPayload) => authService.updateMe(payload),
  })
}
