import { useState } from 'react'
import { Check, Minus, Pencil, Plus, ShieldCheck, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { Modal } from '@/components/common/Modal'
import { CardSkeleton } from '@/components/common/Skeleton'
import { CUSTOM_ROLE_FORM_ID, CustomRoleForm } from '@/components/admin/CustomRoleForm'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  useCreateCustomRole,
  useDeleteCustomRole,
  useUpdateCustomRole,
} from '@/hooks/mutations/useCustomRoleMutations'
import { useCustomRoles } from '@/hooks/queries/useCustomRoles'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/cn'
import { toApiError } from '@/lib/error'
import { PERMISSION_LABELS, ROLE_COLOR_CLASSES } from '@/lib/roles'
import type { CustomRole, CustomRolePayload } from '@/types/custom-role.types'

/** Admin > Roles: the organization's own roles (QA, DevOps, ...) and what each may do. */
export function CustomRolesPage() {
  const { data: roles, isLoading } = useCustomRoles()
  const createRole = useCreateCustomRole()
  const updateRole = useUpdateCustomRole()
  const deleteRole = useDeleteCustomRole()
  const { showToast } = useToast()
  const [editing, setEditing] = useState<CustomRole | 'new' | null>(null)
  const [deleting, setDeleting] = useState<CustomRole | null>(null)

  async function save(payload: CustomRolePayload) {
    try {
      if (editing === 'new') {
        await createRole.mutateAsync(payload)
        showToast({ title: `Role "${payload.name}" created`, variant: 'success' })
      } else if (editing) {
        await updateRole.mutateAsync({ id: editing.id, payload })
        showToast({ title: `Role "${payload.name}" updated`, variant: 'success' })
      }
      setEditing(null)
    } catch (err) {
      showToast({
        title: 'Could not save role',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function remove() {
    if (!deleting) return
    try {
      await deleteRole.mutateAsync(deleting.id)
      showToast({ title: `Role "${deleting.name}" deleted`, variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not delete role',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles"
        description="What each role may do in the projects its people belong to - the built-in Manager and Developer roles and your own, like QA or DevOps. A project can override any role for itself (project › Permissions)."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus /> New role
          </Button>
        }
      />

      <p className="flex items-start gap-2 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground shadow-soft">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span>
          <strong className="font-medium text-foreground">Admin</strong> always has every permission
          and manages these roles. Managers also own and run their own projects; the permissions
          below are added in projects people are members of.
        </span>
      </p>

      {isLoading ? (
        <CardSkeleton />
      ) : !roles || roles.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No custom roles"
          description="Create roles such as QA, DevOps or Designer to describe what people do and what they may change."
          actionLabel="New role"
          onAction={() => setEditing('new')}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <li
              key={role.id}
              className="flex flex-col rounded-xl border bg-card p-4 shadow-soft"
              aria-label={`${role.name} role`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'mt-1 h-3 w-3 shrink-0 rounded-full',
                    ROLE_COLOR_CLASSES[role.color].dot,
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <h3 className="flex items-center gap-2 truncate font-semibold">
                    {role.name}
                    {role.builtInRole && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        Built-in
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {role.accessLevel === 'Manager' ? 'Manager' : 'Member'} access ·{' '}
                    {role.memberCount} {role.memberCount === 1 ? 'person' : 'people'}
                  </p>
                </div>
              </div>
              {role.description && (
                <p className="mt-3 text-sm text-muted-foreground">{role.description}</p>
              )}
              <ul
                className="mt-3 flex-1 space-y-1.5 text-sm"
                aria-label={`${role.name} permissions`}
              >
                {PERMISSION_LABELS.map((p) => {
                  const on = role.permissions[p.key]
                  return (
                    <li
                      key={p.key}
                      className={cn('flex items-center gap-2', !on && 'text-muted-foreground/70')}
                    >
                      {on ? (
                        <Check
                          className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                          aria-label="Allowed"
                        />
                      ) : (
                        <Minus className="h-4 w-4" aria-label="Not allowed" />
                      )}
                      {p.label}
                    </li>
                  )
                })}
              </ul>
              <div className="mt-4 flex gap-2 border-t pt-3">
                <Button size="sm" variant="outline" onClick={() => setEditing(role)}>
                  <Pencil /> Edit
                </Button>
                {!role.builtInRole && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleting(role)}
                  >
                    <Trash2 /> Delete
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing === 'new' ? 'New role' : `Edit ${editing ? editing.name : ''}`}
        description={
          editing && editing !== 'new' && editing.memberCount > 0
            ? `Changes apply right away to the ${editing.memberCount} ${editing.memberCount === 1 ? 'person' : 'people'} with this role.`
            : undefined
        }
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form={CUSTOM_ROLE_FORM_ID}
              loading={createRole.isPending || updateRole.isPending}
            >
              {editing === 'new' ? 'Create role' : 'Save changes'}
            </Button>
          </>
        }
      >
        {editing && (
          <CustomRoleForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? undefined : editing}
            onSubmit={save}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? 'role'}`}
        description={
          deleting && deleting.memberCount > 0
            ? `${deleting.memberCount} ${deleting.memberCount === 1 ? 'person has' : 'people have'} this role. Give them another role first (Admin > Users).`
            : 'This cannot be undone.'
        }
        variant="destructive"
        confirmLabel="Delete"
        onConfirm={remove}
      />
    </div>
  )
}
