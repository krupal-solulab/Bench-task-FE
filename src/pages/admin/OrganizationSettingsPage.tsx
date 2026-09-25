import { PageHeader } from '@/components/layout/PageHeader'
import { CardSkeleton } from '@/components/common/Skeleton'
import { ErrorState } from '@/components/common/ErrorState'
import { OrganizationSettingsForm } from '@/components/admin/OrganizationSettingsForm'
import { useMyOrganization } from '@/hooks/queries/useOrganizations'
import { useUpdateMyOrganization } from '@/hooks/mutations/useOrganizationMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import type { UpdateOrganizationSettingsPayload } from '@/types/organization.types'

export function OrganizationSettingsPage() {
  const { data: organization, isLoading, isError, error, refetch } = useMyOrganization()
  const updateOrganization = useUpdateMyOrganization()
  const { showToast } = useToast()

  async function handleSubmit(payload: UpdateOrganizationSettingsPayload) {
    try {
      await updateOrganization.mutateAsync(payload)
      showToast({ title: 'Organization settings saved', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not save organization settings',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader
        title="Organization settings"
        description="Manage your organization's name, timezone, and logo"
      />

      <div className="rounded-xl border bg-card p-5 shadow-soft">
        {isLoading && <CardSkeleton />}
        {isError && (
          <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
        )}
        {organization && (
          <OrganizationSettingsForm organization={organization} onSubmit={handleSubmit} />
        )}
      </div>
    </div>
  )
}
