import { useEffect, useState } from 'react'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCustomFieldOverride } from '@/hooks/queries/useProjects'
import {
  useResetCustomFieldOverride,
  useUpdateCustomFieldOverride,
} from '@/hooks/mutations/useProjectMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import { resolveIssueTypes } from '@/types/issue-type.types'
import type { Project } from '@/types/project.types'

export interface CustomFieldOverridesFormProps {
  projectId: string
  project: Project
  canManage: boolean
}

/** Per-issue-type hidden/required overrides for the project's custom fields (Custom Fields v2) -
 * mirrors the Workflow tab's issue-type `Select` pattern, but scoped to just this one setting
 * instead of a whole sub-page, since it's a small addition alongside FieldsSettingsForm. */
export function CustomFieldOverridesForm({
  projectId,
  project,
  canManage,
}: CustomFieldOverridesFormProps) {
  const issueTypeNames = resolveIssueTypes(project).map((t) => t.name)
  const [issueType, setIssueType] = useState<string>(issueTypeNames[0] ?? '')

  const { data: override } = useCustomFieldOverride(
    project.customFields.length > 0 ? projectId : undefined,
    issueType || undefined,
  )
  const updateOverride = useUpdateCustomFieldOverride(projectId, issueType)
  const resetOverride = useResetCustomFieldOverride(projectId, issueType)
  const { showToast } = useToast()

  const [hidden, setHidden] = useState<string[]>([])
  const [required, setRequired] = useState<string[]>([])
  const [optional, setOptional] = useState<string[]>([])

  useEffect(() => {
    setHidden(override?.hiddenFieldIds ?? [])
    setRequired(override?.requiredFieldIds ?? [])
    setOptional(override?.optionalFieldIds ?? [])
  }, [override])

  if (project.customFields.length === 0 || issueTypeNames.length === 0) return null

  function setHiddenFor(id: string, checked: boolean) {
    setHidden(checked ? [...hidden, id] : hidden.filter((x) => x !== id))
  }

  function setRequiredFor(id: string, checked: boolean) {
    setRequired(
      checked ? [...required.filter((x) => x !== id), id] : required.filter((x) => x !== id),
    )
    if (checked) setOptional(optional.filter((x) => x !== id))
  }

  function setOptionalFor(id: string, checked: boolean) {
    setOptional(
      checked ? [...optional.filter((x) => x !== id), id] : optional.filter((x) => x !== id),
    )
    if (checked) setRequired(required.filter((x) => x !== id))
  }

  async function handleSave() {
    try {
      const saved = await updateOverride.mutateAsync({
        hiddenFieldIds: hidden,
        requiredFieldIds: required,
        optionalFieldIds: optional,
      })
      setHidden(saved.hiddenFieldIds)
      setRequired(saved.requiredFieldIds)
      setOptional(saved.optionalFieldIds)
      showToast({ title: 'Field override updated', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not update field override',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleReset() {
    try {
      const reset = await resetOverride.mutateAsync()
      setHidden(reset.hiddenFieldIds)
      setRequired(reset.requiredFieldIds)
      setOptional(reset.optionalFieldIds)
      showToast({ title: 'Field override reset', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not reset field override',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-3 border-t pt-6">
      <h3 className="font-medium">Field overrides per issue type</h3>
      <p className="text-sm text-muted-foreground">
        Hide a field, or force it required/optional, for one issue type - the settings above still
        apply to every other issue type.
      </p>

      <FormField label="Issue type" htmlFor="custom-field-override-issue-type" className="max-w-xs">
        <Select value={issueType} onValueChange={setIssueType}>
          <SelectTrigger id="custom-field-override-issue-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {issueTypeNames.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      {canManage ? (
        <div className="space-y-2 rounded-md border p-3">
          {project.customFields.map((field) => (
            <div key={field.id} className="flex items-center gap-4 text-sm">
              <span className="w-40 truncate">{field.name}</span>
              <label className="flex items-center gap-1.5">
                <Checkbox
                  aria-label={`Hide ${field.name} for ${issueType}`}
                  checked={hidden.includes(field.id)}
                  onCheckedChange={(checked) => setHiddenFor(field.id, checked === true)}
                />
                Hidden
              </label>
              <label className="flex items-center gap-1.5">
                <Checkbox
                  aria-label={`Force ${field.name} required for ${issueType}`}
                  checked={required.includes(field.id)}
                  onCheckedChange={(checked) => setRequiredFor(field.id, checked === true)}
                />
                Required
              </label>
              <label className="flex items-center gap-1.5">
                <Checkbox
                  aria-label={`Force ${field.name} optional for ${issueType}`}
                  checked={optional.includes(field.id)}
                  onCheckedChange={(checked) => setOptionalFor(field.id, checked === true)}
                />
                Optional
              </label>
            </div>
          ))}

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleReset()}
              loading={resetOverride.isPending}
            >
              Reset to defaults
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              loading={updateOverride.isPending}
            >
              Save override
            </Button>
          </div>
        </div>
      ) : (
        <ul className="space-y-1 text-sm text-muted-foreground">
          {project.customFields.map((field) => {
            const note = hidden.includes(field.id)
              ? 'hidden'
              : required.includes(field.id)
                ? 'required'
                : optional.includes(field.id)
                  ? 'optional'
                  : null
            return note ? (
              <li key={field.id}>
                {field.name}: {note} for {issueType}
              </li>
            ) : null
          })}
        </ul>
      )}
    </div>
  )
}
