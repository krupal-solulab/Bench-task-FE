import { useState } from 'react'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useSetOrganizationStatus } from '@/hooks/mutations/useOrganizationMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import { cn } from '@/lib/cn'
import type { Organization } from '@/types/organization.types'

export function OrganizationStatusToggle({ organization }: { organization: Organization }) {
  const setStatus = useSetOrganizationStatus(organization.id)
  const { showToast } = useToast()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const isActive = organization.status === 'Active'

  async function confirmToggle() {
    try {
      await setStatus.mutateAsync(isActive ? 'Suspended' : 'Active')
      showToast({
        title: isActive ? 'Organization suspended' : 'Organization activated',
        variant: 'success',
      })
    } catch (err) {
      showToast({
        title: 'Could not update organization status',
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
        aria-checked={isActive}
        aria-label={isActive ? `Suspend ${organization.name}` : `Activate ${organization.name}`}
        onClick={() => setConfirmOpen(true)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          isActive ? 'bg-primary' : 'bg-muted',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-background transition-transform',
            isActive ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={isActive ? 'Suspend organization' : 'Activate organization'}
        description={
          isActive
            ? `Suspending ${organization.name} will block its members from signing in and prevent new admins from being added until it's reactivated.`
            : `Activate ${organization.name}?`
        }
        variant={isActive ? 'destructive' : 'default'}
        confirmLabel={isActive ? 'Suspend' : 'Activate'}
        onConfirm={confirmToggle}
      />
    </>
  )
}
