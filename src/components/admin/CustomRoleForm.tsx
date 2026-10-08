import { useState } from 'react'
import { Check } from 'lucide-react'
import { FormField } from '@/components/common/FormField'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/cn'
import { PERMISSION_LABELS, ROLE_COLOR_CLASSES } from '@/lib/roles'
import {
  CUSTOM_ROLE_COLORS,
  type CustomRole,
  type CustomRoleColor,
  type CustomRolePayload,
} from '@/types/custom-role.types'
import type { MemberPermissions } from '@/types/project.types'
import type { ProjectMemberRole } from '@/types/user.types'

export const CUSTOM_ROLE_FORM_ID = 'custom-role-form'

const NO_PERMISSIONS: MemberPermissions = {
  canCreateTask: false,
  canEditAnyTask: false,
  canDeleteTask: false,
  canChangeAnyTaskStatus: false,
  canManageSprints: false,
  canManageProject: false,
}

const ACCESS_LEVELS: Array<{ value: ProjectMemberRole; title: string; text: string }> = [
  {
    value: 'Developer',
    title: 'Member',
    text: 'Works in the projects they are added to. Updates their own tasks.',
  },
  {
    value: 'Manager',
    title: 'Manager',
    text: 'Can also create and own projects, and manage their members.',
  },
]

/** Create/edit a custom role. Submits through the form id so a Modal footer can hold the button. */
export function CustomRoleForm({
  initial,
  onSubmit,
}: {
  initial?: CustomRole
  onSubmit: (payload: CustomRolePayload) => Promise<void>
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [color, setColor] = useState<CustomRoleColor>(initial?.color ?? 'blue')
  const [accessLevel, setAccessLevel] = useState<ProjectMemberRole>(
    initial?.accessLevel ?? 'Developer',
  )
  const [permissions, setPermissions] = useState<MemberPermissions>(
    initial?.permissions ?? NO_PERMISSIONS,
  )
  const [nameError, setNameError] = useState<string | null>(null)
  const builtIn = !!initial?.builtInRole

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 2 || trimmed.length > 40) {
      setNameError('Name must be 2-40 characters')
      return
    }
    setNameError(null)
    await onSubmit({
      name: trimmed,
      description: description.trim(),
      color,
      accessLevel,
      permissions,
    })
  }

  return (
    <form
      id={CUSTOM_ROLE_FORM_ID}
      onSubmit={(e) => void submit(e)}
      className="space-y-5"
      noValidate
    >
      <FormField label="Name" htmlFor="role-name" error={nameError ?? undefined} required>
        <Input
          id="role-name"
          disabled={builtIn}
          value={name}
          maxLength={40}
          placeholder="e.g. QA, DevOps, Scrum Master"
          onChange={(e) => setName(e.target.value)}
        />
      </FormField>

      <FormField label="Description" htmlFor="role-description">
        <Textarea
          id="role-description"
          rows={2}
          maxLength={200}
          value={description}
          placeholder="What people in this role do"
          onChange={(e) => setDescription(e.target.value)}
        />
      </FormField>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Colour</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
          {CUSTOM_ROLE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={c}
              onClick={() => setColor(c)}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition',
                ROLE_COLOR_CLASSES[c].dot,
                color === c ? 'ring-2 ring-ring' : 'opacity-80 hover:opacity-100',
              )}
            >
              {color === c && <Check className="h-4 w-4 text-white" aria-hidden />}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Access level</legend>
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Access level">
          {ACCESS_LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              role="radio"
              aria-checked={accessLevel === level.value}
              disabled={builtIn}
              onClick={() => setAccessLevel(level.value)}
              className={cn(
                'rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                accessLevel === level.value
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'hover:bg-accent/50',
              )}
            >
              <span className="block text-sm font-semibold">{level.title}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{level.text}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Permissions</legend>
        <p className="text-xs text-muted-foreground">
          Apply in every project the person is a member of, on top of anything granted there.
        </p>
        <div className="divide-y rounded-lg border">
          {PERMISSION_LABELS.map((p) => (
            <label
              key={p.key}
              className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-accent/40"
            >
              <Checkbox
                className="mt-0.5"
                checked={permissions[p.key]}
                onCheckedChange={(v) => setPermissions({ ...permissions, [p.key]: v === true })}
                aria-label={p.label}
              />
              <span>
                <span className="block text-sm font-medium">{p.label}</span>
                <span className="block text-xs text-muted-foreground">{p.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </form>
  )
}
