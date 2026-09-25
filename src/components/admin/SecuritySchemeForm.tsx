import { useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { UserSelect } from '@/components/common/UserSelect'
import { useAssignableUsers } from '@/hooks/queries/useUsers'
import { GrantTeamsAndRoles } from './GrantTeamsAndRoles'
import { ORG_ROLES } from '@/types/user.types'
import type { CreateSecuritySchemePayload, SecurityLevel } from '@/types/security-scheme.types'

function emptyLevel(): SecurityLevel {
  return {
    name: '',
    allowedRoles: [],
    allowedUserIds: [],
    allowedTeamIds: [],
    allowedProjectRoleIds: [],
  }
}

export interface SecuritySchemeFormProps {
  initialValues?: { name: string; levels: SecurityLevel[] }
  onSubmit: (values: CreateSecuritySchemePayload) => Promise<void>
  onCancel: () => void
  submitLabel: string
}

export function SecuritySchemeForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel,
}: SecuritySchemeFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [levels, setLevels] = useState<SecurityLevel[]>(
    initialValues?.levels?.length ? initialValues.levels : [emptyLevel()],
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { data: users } = useAssignableUsers()

  const userById = new Map((users?.data ?? []).map((u) => [u.id, u]))

  function updateLevel(index: number, patch: Partial<SecurityLevel>) {
    setLevels(levels.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }

  function toggleRole(index: number, role: (typeof ORG_ROLES)[number]) {
    const level = levels[index]!
    const next = level.allowedRoles.includes(role)
      ? level.allowedRoles.filter((r) => r !== role)
      : [...level.allowedRoles, role]
    updateLevel(index, { allowedRoles: next })
  }

  function addUser(index: number, userId: string | null) {
    if (!userId) return
    const level = levels[index]!
    if (level.allowedUserIds.includes(userId)) return
    updateLevel(index, { allowedUserIds: [...level.allowedUserIds, userId] })
  }

  function removeUser(index: number, userId: string) {
    const level = levels[index]!
    updateLevel(index, { allowedUserIds: level.allowedUserIds.filter((id) => id !== userId) })
  }

  const isValid = name.trim().length > 0 && levels.every((l) => l.name.trim().length > 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        levels: levels.map((l) => ({ ...l, name: l.name.trim() })),
      })
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
          placeholder="e.g. Standard confidentiality levels"
        />
      </FormField>

      <div className="space-y-3">
        <p className="text-sm font-medium">Security levels</p>
        {levels.map((level, index) => (
          <div key={index} className="space-y-2 rounded-md border p-3">
            <div className="flex items-center gap-2">
              <Input
                value={level.name}
                onChange={(e) => updateLevel(index, { name: e.target.value })}
                placeholder="e.g. Confidential"
                aria-label={`Level ${index + 1} name`}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => setLevels(levels.filter((_, i) => i !== index))}
                aria-label={`Remove level ${index + 1}`}
                disabled={levels.length === 1}
                className="text-muted-foreground hover:text-destructive disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              {ORG_ROLES.map((role) => (
                <label key={role} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    aria-label={`Level ${index + 1}: ${role}`}
                    checked={level.allowedRoles.includes(role)}
                    onCheckedChange={() => toggleRole(index, role)}
                  />
                  {role}
                </label>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {level.allowedUserIds.map((userId) => (
                <span
                  key={userId}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                >
                  {userById.get(userId)?.name ?? userId}
                  <button
                    type="button"
                    onClick={() => removeUser(index, userId)}
                    aria-label={`Remove ${userById.get(userId)?.name ?? userId} from level ${index + 1}`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <UserSelect
              value={null}
              onChange={(userId) => addUser(index, userId)}
              allowUnassigned={false}
              placeholder="+ Add an individual…"
            />

            <GrantTeamsAndRoles
              idPrefix={`Level ${index + 1}`}
              allowedTeamIds={level.allowedTeamIds}
              allowedProjectRoleIds={level.allowedProjectRoleIds}
              onChangeTeamIds={(ids) => updateLevel(index, { allowedTeamIds: ids })}
              onChangeProjectRoleIds={(ids) => updateLevel(index, { allowedProjectRoleIds: ids })}
            />
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => setLevels([...levels, emptyLevel()])}
        >
          <Plus className="h-3.5 w-3.5" /> Add level
        </Button>
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting} disabled={!isValid}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
