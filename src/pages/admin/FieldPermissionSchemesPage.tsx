import { useState } from 'react'
import { KeyRound, Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { FieldPermissionSchemeForm } from '@/components/admin/FieldPermissionSchemeForm'
import { useFieldPermissionSchemes } from '@/hooks/queries/useFieldPermissionSchemes'
import {
  useCreateFieldPermissionScheme,
  useDeleteFieldPermissionScheme,
  useUpdateFieldPermissionScheme,
} from '@/hooks/mutations/useFieldPermissionSchemeMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import type {
  CreateFieldPermissionSchemePayload,
  FieldPermissionScheme,
} from '@/types/field-permission-scheme.types'

export function FieldPermissionSchemesPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<FieldPermissionScheme | null>(null)
  const [deleting, setDeleting] = useState<FieldPermissionScheme | null>(null)

  const { data: schemes, isLoading } = useFieldPermissionSchemes()
  const createScheme = useCreateFieldPermissionScheme()
  const updateScheme = useUpdateFieldPermissionScheme(editing?.id ?? '')
  const deleteScheme = useDeleteFieldPermissionScheme()
  const { showToast } = useToast()

  async function handleCreate(values: CreateFieldPermissionSchemePayload) {
    try {
      await createScheme.mutateAsync(values)
      showToast({ title: 'Field permission scheme created', variant: 'success' })
      setCreateOpen(false)
    } catch (err) {
      showToast({
        title: 'Could not create field permission scheme',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleUpdate(values: CreateFieldPermissionSchemePayload) {
    try {
      await updateScheme.mutateAsync(values)
      showToast({ title: 'Field permission scheme updated', variant: 'success' })
      setEditing(null)
    } catch (err) {
      showToast({
        title: 'Could not update field permission scheme',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleDelete() {
    if (!deleting) return
    try {
      await deleteScheme.mutateAsync(deleting.id)
      showToast({ title: 'Field permission scheme deleted', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not delete field permission scheme',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Field permission schemes"
        description="Restrict which roles can view or edit specific fields on an issue - assign a scheme to a project from its Permissions tab"
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" /> New scheme
          </Button>
        }
      />

      {!isLoading && (schemes ?? []).length === 0 && (
        <EmptyState
          icon={KeyRound}
          title="No field permission schemes yet"
          description="Create a scheme to hide or lock specific fields (built-in or custom) from certain roles."
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
              {scheme.rules.length} rule{scheme.rules.length === 1 ? '' : 's'}:{' '}
              {scheme.rules.map((r) => r.fieldId).join(', ') || '—'}
            </p>
          </div>
        ))}
      </div>

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New field permission scheme"
        size="lg"
      >
        <FieldPermissionSchemeForm
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
          <FieldPermissionSchemeForm
            initialValues={{ name: editing.name, rules: editing.rules }}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            submitLabel="Save changes"
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete field permission scheme"
        description={`Delete "${deleting?.name ?? ''}"? This cannot be undone. Unassign it from every project first.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
