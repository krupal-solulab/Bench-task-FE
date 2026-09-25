import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { UserSelect } from '@/components/common/UserSelect'
import { useAssignableUsers } from '@/hooks/queries/useUsers'
import { GrantTeamsAndRoles } from './GrantTeamsAndRoles'
import { ORG_ROLES } from '@/types/user.types'
import { SCHEME_ACTIONS } from '@/types/permission-scheme.types'
import type {
  CreatePermissionSchemePayload,
  PermissionGrant,
  SchemeAction,
} from '@/types/permission-scheme.types'

const ACTION_LABELS: Record<SchemeAction, string> = {
  CreateIssue: 'Create issue',
  Assign: 'Assign',
  Transition: 'Change status',
  Delete: 'Delete',
  EditCustomFields: 'Edit task fields',
  ManageSprint: 'Manage sprints',
}

function emptyGrants(): PermissionGrant[] {
  return SCHEME_ACTIONS.map((action) => ({
    action,
    allowedRoles: [],
    allowedUserIds: [],
    allowedTeamIds: [],
    allowedProjectRoleIds: [],
  }))
}

/** Fills in any action the scheme doesn't yet have a grant row for (e.g. an older scheme saved
 * before a new action existed), and backfills allowedTeamIds/allowedProjectRoleIds for a scheme
 * saved before Module 6 - so every row always renders with every field defined. */
function withAllActions(grants: PermissionGrant[]): PermissionGrant[] {
  const byAction = new Map(grants.map((g) => [g.action, g]))
  return SCHEME_ACTIONS.map((action) => {
    const existing = byAction.get(action)
    return {
      action,
      allowedRoles: existing?.allowedRoles ?? [],
      allowedUserIds: existing?.allowedUserIds ?? [],
      allowedTeamIds: existing?.allowedTeamIds ?? [],
      allowedProjectRoleIds: existing?.allowedProjectRoleIds ?? [],
    }
  })
}

export interface PermissionSchemeFormProps {
  initialValues?: { name: string; grants: PermissionGrant[] }
  onSubmit: (values: CreatePermissionSchemePayload) => Promise<void>
  onCancel: () => void
  submitLabel: string
}

export function PermissionSchemeForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel,
}: PermissionSchemeFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [grants, setGrants] = useState<PermissionGrant[]>(
    withAllActions(initialValues?.grants ?? emptyGrants()),
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { data: users } = useAssignableUsers()

  const userById = new Map((users?.data ?? []).map((u) => [u.id, u]))

  function updateGrant(action: SchemeAction, patch: Partial<PermissionGrant>) {
    setGrants(grants.map((g) => (g.action === action ? { ...g, ...patch } : g)))
  }

  function toggleRole(action: SchemeAction, role: (typeof ORG_ROLES)[number]) {
    const grant = grants.find((g) => g.action === action)!
    const next = grant.allowedRoles.includes(role)
      ? grant.allowedRoles.filter((r) => r !== role)
      : [...grant.allowedRoles, role]
    updateGrant(action, { allowedRoles: next })
  }

  function addUser(action: SchemeAction, userId: string | null) {
    if (!userId) return
    const grant = grants.find((g) => g.action === action)!
    if (grant.allowedUserIds.includes(userId)) return
    updateGrant(action, { allowedUserIds: [...grant.allowedUserIds, userId] })
  }

  function removeUser(action: SchemeAction, userId: string) {
    const grant = grants.find((g) => g.action === action)!
    updateGrant(action, { allowedUserIds: grant.allowedUserIds.filter((id) => id !== userId) })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit({ name: name.trim(), grants })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
      <FormField label="Name" htmlFor="scheme-name" required>
        <Input
          id="scheme-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Strict (QA cannot delete)"
        />
      </FormField>

      <div className="space-y-3">
        <p className="text-sm font-medium">Who can do each action</p>
        {grants.map((grant) => (
          <div key={grant.action} className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">{ACTION_LABELS[grant.action]}</p>
            <div className="flex flex-wrap gap-3">
              {ORG_ROLES.map((role) => (
                <label key={role} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    aria-label={`${ACTION_LABELS[grant.action]}: ${role}`}
                    checked={grant.allowedRoles.includes(role)}
                    onCheckedChange={() => toggleRole(grant.action, role)}
                  />
                  {role}
                </label>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {grant.allowedUserIds.map((userId) => (
                <span
                  key={userId}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                >
                  {userById.get(userId)?.name ?? userId}
                  <button
                    type="button"
                    onClick={() => removeUser(grant.action, userId)}
                    aria-label={`Remove ${userById.get(userId)?.name ?? userId} from ${ACTION_LABELS[grant.action]}`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <UserSelect
              value={null}
              onChange={(userId) => addUser(grant.action, userId)}
              allowUnassigned={false}
              placeholder="+ Add an individual…"
            />

            <GrantTeamsAndRoles
              idPrefix={ACTION_LABELS[grant.action]}
              allowedTeamIds={grant.allowedTeamIds ?? []}
              allowedProjectRoleIds={grant.allowedProjectRoleIds ?? []}
              onChangeTeamIds={(ids) => updateGrant(grant.action, { allowedTeamIds: ids })}
              onChangeProjectRoleIds={(ids) =>
                updateGrant(grant.action, { allowedProjectRoleIds: ids })
              }
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting} disabled={!name.trim()}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
