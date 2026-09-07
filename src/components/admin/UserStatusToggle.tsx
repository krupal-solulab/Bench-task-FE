import { useState } from 'react'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useUpdateUserStatus } from '@/hooks/mutations/useUserMutations'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import { cn } from '@/lib/cn'
import type { User } from '@/types/user.types'

export function UserStatusToggle({ user }: { user: User }) {
  const { user: currentUser } = useAuth()
  const updateStatus = useUpdateUserStatus(user.id)
  const { showToast } = useToast()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const isSelf = currentUser?.id === user.id

  async function confirmToggle() {
    try {
      await updateStatus.mutateAsync(!user.isActive)
      showToast({
        title: user.isActive ? 'User deactivated' : 'User activated',
        variant: 'success',
      })
    } catch (err) {
      showToast({
        title: 'Could not update status',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    } finally {
      setConfirmOpen(false)
    }
  }

  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={user.isActive}
        aria-label={user.isActive ? `Deactivate ${user.name}` : `Activate ${user.name}`}
        disabled={isSelf}
        onClick={() => setConfirmOpen(true)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          user.isActive ? 'bg-primary' : 'bg-muted',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-background transition-transform',
            user.isActive ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={user.isActive ? 'Deactivate user' : 'Activate user'}
        description={
          user.isActive
            ? `Deactivating ${user.name} will sign them out and block further logins.`
            : `Activate ${user.name}'s account?`
        }
        variant={user.isActive ? 'destructive' : 'default'}
        confirmLabel={user.isActive ? 'Deactivate' : 'Activate'}
        onConfirm={confirmToggle}
      />
    </>
  )
}
