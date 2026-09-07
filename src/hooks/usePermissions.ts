import { can, canEditTaskField, type Capability } from '@/lib/permissions'
import { useAuth } from './useAuth'

export function usePermissions() {
  const { user } = useAuth()

  return {
    can: (capability: Capability) => can(user?.role, capability),
    canEditTaskField: (field: 'status' | 'other', isAssignee: boolean) =>
      canEditTaskField(user?.role, field, isAssignee),
  }
}
