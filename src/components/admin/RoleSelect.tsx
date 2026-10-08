import { useState } from 'react'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { RoleChoiceSelect } from '@/components/admin/RoleChoiceSelect'
import { useUpdateUserRole } from '@/hooks/mutations/useUserMutations'
import { useCustomRoles } from '@/hooks/queries/useCustomRoles'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import { fromRoleChoice, roleChoiceLabel, toRoleChoice, type RoleChoice } from '@/lib/roles'
import type { User } from '@/types/user.types'

/** Inline role change in the users table - built-in or custom role, behind a confirmation. */
export function RoleSelect({ user }: { user: User }) {
  const { user: currentUser } = useAuth()
  const updateRole = useUpdateUserRole(user.id)
  const { data: customRoles } = useCustomRoles()
  const { showToast } = useToast()
  const [pending, setPending] = useState<RoleChoice | null>(null)

  const isSelf = currentUser?.id === user.id
  const pendingLabel = pending ? roleChoiceLabel(pending, customRoles) : ''

  async function confirmChange() {
    if (!pending) return
    try {
      await updateRole.mutateAsync(fromRoleChoice(pending, customRoles))
      showToast({ title: `Role updated to ${pendingLabel}`, variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not update role',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    } finally {
      setPending(null)
    }
  }

  return (
    <>
      <RoleChoiceSelect
        value={toRoleChoice(user)}
        onChange={(choice) => choice !== toRoleChoice(user) && setPending(choice)}
        disabled={isSelf}
        className="w-40"
        ariaLabel={`Change role for ${user.name}`}
      />

      <ConfirmDialog
        open={!!pending}
        onOpenChange={(open) => !open && setPending(null)}
        title="Change role"
        description={`Change ${user.name}'s role to ${pendingLabel}?`}
        confirmLabel="Change role"
        onConfirm={confirmChange}
      />
    </>
  )
}
