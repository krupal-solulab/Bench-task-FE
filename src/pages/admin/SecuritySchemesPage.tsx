import { useState } from 'react'
import { Lock, Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { SecuritySchemeForm } from '@/components/admin/SecuritySchemeForm'
import { useSecuritySchemes } from '@/hooks/queries/useSecuritySchemes'
import {
  useCreateSecurityScheme,
  useDeleteSecurityScheme,
  useUpdateSecurityScheme,
} from '@/hooks/mutations/useSecuritySchemeMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import type { CreateSecuritySchemePayload, SecurityScheme } from '@/types/security-scheme.types'

export function SecuritySchemesPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<SecurityScheme | null>(null)
  const [deleting, setDeleting] = useState<SecurityScheme | null>(null)

  const { data: schemes, isLoading } = useSecuritySchemes()
  const createScheme = useCreateSecurityScheme()
  const updateScheme = useUpdateSecurityScheme(editing?.id ?? '')
  const deleteScheme = useDeleteSecurityScheme()
  const { showToast } = useToast()

  async function handleCreate(values: CreateSecuritySchemePayload) {
    try {
      await createScheme.mutateAsync(values)
      showToast({ title: 'Security scheme created', variant: 'success' })
      setCreateOpen(false)
    } catch (err) {
      showToast({
        title: 'Could not create security scheme',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleUpdate(values: CreateSecuritySchemePayload) {
    try {
      await updateScheme.mutateAsync(values)
      showToast({ title: 'Security scheme updated', variant: 'success' })
      setEditing(null)
    } catch (err) {
      showToast({
        title: 'Could not update security scheme',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleDelete() {
    if (!deleting) return
    try {
      await deleteScheme.mutateAsync(deleting.id)
      showToast({ title: 'Security scheme deleted', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not delete security scheme',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security schemes"
        description="Define issue-level view restrictions (security levels) - assign a scheme to a project from its Permissions tab, then set each issue's level from its detail page"
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" /> New scheme
          </Button>
        }
      />

      {!isLoading && (schemes ?? []).length === 0 && (
        <EmptyState
          icon={Lock}
          title="No security schemes yet"
          description="Create a scheme to restrict who can view specific issues, beyond project membership."
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
              {scheme.levels.length} level{scheme.levels.length === 1 ? '' : 's'}:{' '}
              {scheme.levels.map((l) => l.name).join(', ') || '—'}
            </p>
          </div>
        ))}
      </div>

      <Modal open={createOpen} onOpenChange={setCreateOpen} title="New security scheme" size="lg">
        <SecuritySchemeForm
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
          <SecuritySchemeForm
            initialValues={{ name: editing.name, levels: editing.levels }}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            submitLabel="Save changes"
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete security scheme"
        description={`Delete "${deleting?.name ?? ''}"? This cannot be undone. Unassign it from every project first.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
