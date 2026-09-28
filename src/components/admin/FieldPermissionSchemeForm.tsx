import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ORG_ROLES } from '@/types/user.types'
import {
  BUILT_IN_TASK_FIELD_IDS,
  type CreateFieldPermissionSchemePayload,
  type FieldPermissionRule,
} from '@/types/field-permission-scheme.types'

function emptyRule(): FieldPermissionRule {
  return { fieldId: '', hiddenFromRoles: [], readOnlyForRoles: [] }
}

export interface FieldPermissionSchemeFormProps {
  initialValues?: { name: string; rules: FieldPermissionRule[] }
  onSubmit: (values: CreateFieldPermissionSchemePayload) => Promise<void>
  onCancel: () => void
  submitLabel: string
}

/** Deliberately role-only (no user/team/project-role pickers, unlike SecuritySchemeForm) -
 * mirrors the backend's own simpler shape for this scheme (see field-permission-scheme.schema.ts's
 * doc comment for why). `fieldId` accepts any of the built-in field ids or a project's own custom
 * field id (typed freely - a scheme is reused across projects with different custom fields, so
 * there's nothing to validate it against here). */
export function FieldPermissionSchemeForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel,
}: FieldPermissionSchemeFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [rules, setRules] = useState<FieldPermissionRule[]>(
    initialValues?.rules?.length ? initialValues.rules : [emptyRule()],
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateRule(index: number, patch: Partial<FieldPermissionRule>) {
    setRules(rules.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function toggleRole(index: number, list: 'hiddenFromRoles' | 'readOnlyForRoles', role: string) {
    const rule = rules[index]!
    const current = rule[list] as string[]
    const next = current.includes(role) ? current.filter((r) => r !== role) : [...current, role]
    updateRule(index, { [list]: next } as Partial<FieldPermissionRule>)
  }

  const fieldIds = rules.map((r) => r.fieldId.trim())
  const isValid =
    name.trim().length > 0 &&
    rules.every((r) => r.fieldId.trim().length > 0) &&
    new Set(fieldIds).size === fieldIds.length

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        rules: rules.map((r) => ({ ...r, fieldId: r.fieldId.trim() })),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
      <FormField label="Name" htmlFor="fp-scheme-name" required>
        <Input
          id="fp-scheme-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Support field restrictions"
        />
      </FormField>

      <datalist id="field-permission-field-ids">
        {BUILT_IN_TASK_FIELD_IDS.map((id) => (
          <option key={id} value={id} />
        ))}
      </datalist>

      <div className="space-y-3">
        <p className="text-sm font-medium">Field rules</p>
        {rules.map((rule, index) => (
          <div key={index} className="space-y-2 rounded-md border p-3">
            <div className="flex items-center gap-2">
              <Input
                list="field-permission-field-ids"
                value={rule.fieldId}
                onChange={(e) => updateRule(index, { fieldId: e.target.value })}
                placeholder="e.g. priority, or a custom field id"
                aria-label={`Rule ${index + 1} field id`}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => setRules(rules.filter((_, i) => i !== index))}
                aria-label={`Remove rule ${index + 1}`}
                disabled={rules.length === 1}
                className="text-muted-foreground hover:text-destructive disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Hidden from (cannot view)
                </p>
                <div className="flex flex-wrap gap-3">
                  {ORG_ROLES.map((role) => (
                    <label key={role} className="flex items-center gap-1.5 text-sm">
                      <Checkbox
                        aria-label={`Rule ${index + 1}: hide from ${role}`}
                        checked={rule.hiddenFromRoles.includes(role)}
                        onCheckedChange={() => toggleRole(index, 'hiddenFromRoles', role)}
                      />
                      {role}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Read-only for (can view, not edit)
                </p>
                <div className="flex flex-wrap gap-3">
                  {ORG_ROLES.map((role) => (
                    <label key={role} className="flex items-center gap-1.5 text-sm">
                      <Checkbox
                        aria-label={`Rule ${index + 1}: read-only for ${role}`}
                        checked={rule.readOnlyForRoles.includes(role)}
                        onCheckedChange={() => toggleRole(index, 'readOnlyForRoles', role)}
                      />
                      {role}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => setRules([...rules, emptyRule()])}
        >
          <Plus className="h-3.5 w-3.5" /> Add rule
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
