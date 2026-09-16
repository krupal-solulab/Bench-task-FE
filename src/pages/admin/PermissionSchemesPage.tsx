import { useState } from 'react'
import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { PermissionSchemeForm } from '@/components/admin/PermissionSchemeForm'
import { usePermissionSchemes } from '@/hooks/queries/usePermissionSchemes'
import {
  useCreatePermissionScheme,
  useDeletePermissionScheme,
  useUpdatePermissionScheme,
} from '@/hooks/mutations/usePermissionSchemeMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import type {
  CreatePermissionSchemePayload,
  PermissionScheme,
} from '@/types/permission-scheme.types'

export function PermissionSchemesPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<PermissionScheme | null>(null)
  const [deleting, setDeleting] = useState<PermissionScheme | null>(null)

  const { data: schemes, isLoading } = usePermissionSchemes()
  const createScheme = useCreatePermissionScheme()
  const updateScheme = useUpdatePermissionScheme(editing?.id ?? '')
  const deleteScheme = useDeletePermissionScheme()
  const { showToast } = useToast()

  async function handleCreate(values: CreatePermissionSchemePayload) {
    try {
      await createScheme.mutateAsync(values)
      showToast({ title: 'Permission scheme created', variant: 'success' })
      setCreateOpen(false)
    } catch (err) {
      showToast({
        title: 'Could not create permission scheme',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleUpdate(values: CreatePermissionSchemePayload) {
    try {
      await updateScheme.mutateAsync(values)
      showToast({ title: 'Permission scheme updated', variant: 'success' })
      setEditing(null)
    } catch (err) {
      showToast({
        title: 'Could not update permission scheme',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleDelete() {
    if (!deleting) return
    try {
      await deleteScheme.mutateAsync(deleting.id)
      showToast({ title: 'Permission scheme deleted', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not delete permission scheme',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permission schemes"
        description="Define who can create, assign, transition, delete, edit fields on, or manage sprints for tasks - then assign a scheme to a project from its settings"
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" /> New scheme
          </Button>
        }
      />

      {!isLoading && (schemes ?? []).length === 0 && (
        <EmptyState
          icon={ShieldCheck}
          title="No permission schemes yet"
          description="Create a scheme to control per-action access beyond the default role permissions."
          actionLabel="New scheme"
          onAction={() => setCreateOpen(true)}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(schemes ?? []).map((scheme) => (
          <div key={scheme.id} className="space-y-2 rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">{scheme.name}</p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditing(scheme)}
                  aria-label={`Edit ${scheme.name}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(scheme)}
                  aria-label={`Delete ${scheme.name}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {scheme.grants.filter((g) => g.allowedRoles.length || g.allowedUserIds.length).length}{' '}
              of {scheme.grants.length} actions configured
            </p>
          </div>
        ))}
      </div>

      <Modal open={createOpen} onOpenChange={setCreateOpen} title="New permission scheme" size="lg">
        <PermissionSchemeForm
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
          submitLabel="Create scheme"
        />
      </Modal>

      <Modal
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        title={`Edit "${editing?.name ?? ''}"`}
        size="lg"
      >
        {editing && (
          <PermissionSchemeForm
            initialValues={{ name: editing.name, grants: editing.grants }}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            submitLabel="Save changes"
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete permission scheme"
        description={`Delete "${deleting?.name ?? ''}"? This cannot be undone. Unassign it from every project first.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
