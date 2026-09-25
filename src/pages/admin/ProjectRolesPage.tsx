import { useState } from 'react'
import { Pencil, Plus, Trash2, UserCog } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { ProjectRoleForm } from '@/components/admin/ProjectRoleForm'
import { useProjectRoles } from '@/hooks/queries/useProjectRoles'
import {
  useCreateProjectRole,
  useDeleteProjectRole,
  useUpdateProjectRole,
} from '@/hooks/mutations/useProjectRoleMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import type { CreateProjectRolePayload, ProjectRole } from '@/types/project-role.types'

export function ProjectRolesPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<ProjectRole | null>(null)
  const [deleting, setDeleting] = useState<ProjectRole | null>(null)

  const { data: roles, isLoading } = useProjectRoles()
  const createRole = useCreateProjectRole()
  const updateRole = useUpdateProjectRole(editing?.id ?? '')
  const deleteRole = useDeleteProjectRole()
  const { showToast } = useToast()

  async function handleCreate(values: CreateProjectRolePayload) {
    try {
      await createRole.mutateAsync(values)
      showToast({ title: 'Project role created', variant: 'success' })
      setCreateOpen(false)
    } catch (err) {
      showToast({
        title: 'Could not create project role',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleUpdate(values: CreateProjectRolePayload) {
    try {
      await updateRole.mutateAsync(values)
      showToast({ title: 'Project role updated', variant: 'success' })
      setEditing(null)
    } catch (err) {
      showToast({
        title: 'Could not update project role',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleDelete() {
    if (!deleting) return
    try {
      await deleteRole.mutateAsync(deleting.id)
      showToast({ title: 'Project role deleted', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not delete project role',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project roles"
        description="Reusable named roles (e.g. Administrators, QA Lead) - assign who fills each one per project from that project's Permissions tab, then reference the role from a Permission/Security Scheme grant"
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" /> New role
          </Button>
        }
      />

      {!isLoading && (roles ?? []).length === 0 && (
        <EmptyState
          icon={UserCog}
          title="No project roles yet"
          description="Create a role, then assign who fills it on each project from that project's Permissions tab."
          actionLabel="New role"
          onAction={() => setCreateOpen(true)}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(roles ?? []).map((role) => (
          <div key={role.id} className="space-y-2 rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{role.name}</p>
                {role.description && (
                  <p className="text-xs text-muted-foreground">{role.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditing(role)}
                  aria-label={`Edit ${role.name}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(role)}
                  aria-label={`Delete ${role.name}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={createOpen} onOpenChange={setCreateOpen} title="New project role">
        <ProjectRoleForm
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
          submitLabel="Create role"
        />
      </Modal>

      <Modal
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        title={`Edit "${editing?.name ?? ''}"`}
      >
        {editing && (
          <ProjectRoleForm
            initialValues={{ name: editing.name, description: editing.description }}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            submitLabel="Save changes"
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete project role"
        description={`Delete "${deleting?.name ?? ''}"? This cannot be undone. Remove it from every project's Role Assignments first.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
