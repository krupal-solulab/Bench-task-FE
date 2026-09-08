import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Pencil, UserPlus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { ErrorState } from '@/components/common/ErrorState'
import { CardSkeleton } from '@/components/common/Skeleton'
import { Avatar } from '@/components/common/Avatar'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/common/FormField'
import { OrganizationStatusToggle } from '@/components/platform/OrganizationStatusToggle'
import { AddOrganizationAdminForm } from '@/components/platform/AddOrganizationAdminForm'
import { useOrganization } from '@/hooks/queries/useOrganizations'
import {
  useAddOrganizationAdmin,
  useRenameOrganization,
} from '@/hooks/mutations/useOrganizationMutations'
import { useToast } from '@/hooks/useToast'
import { formatDate } from '@/lib/date'
import { isConflictError, toApiError } from '@/lib/error'
import type { AddOrganizationAdminFormValues } from '@/schemas/organization.schema'

export function PlatformOrganizationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { showToast } = useToast()

  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)
  const [addAdminOpen, setAddAdminOpen] = useState(false)

  const { data: organization, isLoading, isError, error, refetch } = useOrganization(id)
  const renameOrganization = useRenameOrganization(id ?? '')
  const addAdmin = useAddOrganizationAdmin(id ?? '')

  if (isLoading) {
    return <CardSkeleton />
  }

  if (isError || !organization) {
    return <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
  }

  function openRename() {
    setRenameValue(organization!.name)
    setRenameError(null)
    setRenameOpen(true)
  }

  async function handleRename() {
    const trimmed = renameValue.trim()
    if (trimmed.length < 2) {
      setRenameError('Name must be at least 2 characters')
      return
    }
    try {
      await renameOrganization.mutateAsync(trimmed)
      showToast({ title: 'Organization renamed', variant: 'success' })
      setRenameOpen(false)
    } catch (err) {
      showToast({
        title: 'Could not rename organization',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleAddAdmin(values: AddOrganizationAdminFormValues) {
    try {
      await addAdmin.mutateAsync(values)
      showToast({ title: 'Admin added', variant: 'success' })
      setAddAdminOpen(false)
    } catch (err) {
      if (isConflictError(err)) {
        throw new Error('DUPLICATE_EMAIL')
      }
      showToast({
        title: 'Could not add admin',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={organization.name}
        description={`/${organization.slug} · ${organization.userCount} user(s) · created ${formatDate(organization.createdAt)}`}
        actions={
          <div className="flex items-center gap-2">
            <OrganizationStatusToggle organization={organization} />
            <Button variant="outline" size="sm" onClick={openRename} className="gap-1">
              <Pencil className="h-4 w-4" /> Rename
            </Button>
          </div>
        }
      />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Admins</h2>
        <Button
          size="sm"
          onClick={() => setAddAdminOpen(true)}
          disabled={organization.status === 'Suspended'}
          className="gap-1"
        >
          <UserPlus className="h-4 w-4" /> Add admin
        </Button>
      </div>

      {organization.status === 'Suspended' && (
        <p className="text-xs text-muted-foreground">
          This organization is suspended — new admins can't be added until it's reactivated.
        </p>
      )}

      <div className="divide-y rounded-xl border bg-card shadow-soft">
        {organization.admins.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">No admins yet.</p>
        ) : (
          organization.admins.map((admin) => (
            <div key={admin.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={admin.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{admin.name}</p>
                <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
              </div>
              <span
                className={
                  admin.isActive
                    ? 'rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700'
                    : 'rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600'
                }
              >
                {admin.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          ))
        )}
      </div>

      <Modal open={renameOpen} onOpenChange={setRenameOpen} title="Rename organization">
        <div className="space-y-4">
          <FormField
            label="Organization name"
            htmlFor="rename-org"
            error={renameError ?? undefined}
            required
          >
            <Input
              id="rename-org"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRenameOpen(false)}
              disabled={renameOrganization.isPending}
            >
              Cancel
            </Button>
            <Button type="button" loading={renameOrganization.isPending} onClick={handleRename}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={addAdminOpen} onOpenChange={setAddAdminOpen} title="Add admin">
        <AddOrganizationAdminForm
          onSubmit={handleAddAdmin}
          onCancel={() => setAddAdminOpen(false)}
        />
      </Modal>
    </div>
  )
}
