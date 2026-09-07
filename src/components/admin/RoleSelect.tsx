import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useUpdateUserRole } from '@/hooks/mutations/useUserMutations'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import { ROLES, type Role, type User } from '@/types/user.types'

export function RoleSelect({ user }: { user: User }) {
  const { user: currentUser } = useAuth()
  const updateRole = useUpdateUserRole(user.id)
  const { showToast } = useToast()
  const [pendingRole, setPendingRole] = useState<Role | null>(null)

  const isSelf = currentUser?.id === user.id

  async function confirmChange() {
    if (!pendingRole) return
    try {
      await updateRole.mutateAsync(pendingRole)
      showToast({ title: `Role updated to ${pendingRole}`, variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not update role',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    } finally {
      setPendingRole(null)
    }
  }

  return (
    <>
      <Select value={user.role} onValueChange={(v) => setPendingRole(v as Role)} disabled={isSelf}>
        <SelectTrigger className="w-32" aria-label={`Change role for ${user.name}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((role) => (
            <SelectItem key={role} value={role}>
              {role}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ConfirmDialog
        open={!!pendingRole}
        onOpenChange={(open) => !open && setPendingRole(null)}
        title="Change role"
        description={`Change ${user.name}'s role to ${pendingRole}?`}
        confirmLabel="Change role"
        onConfirm={confirmChange}
      />
    </>
  )
}
