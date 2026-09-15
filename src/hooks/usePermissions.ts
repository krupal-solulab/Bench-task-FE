import { can, canCreateTaskInProject, canEditTaskField, type Capability } from '@/lib/permissions'
import type { MemberPermissions } from '@/types/project.types'
import { useAuth } from './useAuth'

export function usePermissions() {
  const { user } = useAuth()

  return {
    can: (capability: Capability) => can(user?.role, capability),
    canEditTaskField: (
      field: 'status' | 'other' | 'delete',
      isAssignee: boolean,
      grant?: MemberPermissions | null,
    ) => canEditTaskField(user?.role, field, isAssignee, grant),
    canCreateTaskInProject: (grant?: MemberPermissions | null) =>
      canCreateTaskInProject(user?.role, grant),
  }
}
