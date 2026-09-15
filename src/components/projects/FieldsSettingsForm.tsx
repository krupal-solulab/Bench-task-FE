import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { TagInput } from '@/components/common/TagInput'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUpdateComponents, useUpdateCustomFields } from '@/hooks/mutations/useProjectMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import { CUSTOM_FIELD_TYPES } from '@/types/project.types'
import type { CustomFieldDefinition, CustomFieldType, Project } from '@/types/project.types'

export interface FieldsSettingsFormProps {
  projectId: string
  project: Project
  canManage: boolean
}

/** A new field being drafted client-side has no `id` yet - the server assigns one, stable for
 * the field's lifetime, the first time it's saved. */
type EditableCustomField = Partial<Pick<CustomFieldDefinition, 'id'>> &
  Omit<CustomFieldDefinition, 'id'>

/** A settings form for a project's Components pick-list and Custom Field definitions - mirrors
 * WorkflowSettingsForm's shape, with its own independent save action per section. */
export function FieldsSettingsForm({ projectId, project, canManage }: FieldsSettingsFormProps) {
  const [components, setComponents] = useState<string[]>(project.components)
  const [fields, setFields] = useState<EditableCustomField[]>(project.customFields)

  const updateComponents = useUpdateComponents(projectId)
  const updateCustomFields = useUpdateCustomFields(projectId)
  const { showToast } = useToast()

  const validComponentNames = components.map((c) => c.trim()).filter(Boolean)
  const componentsHaveDuplicates = new Set(validComponentNames).size !== validComponentNames.length
  const canSaveComponents =
    canManage && components.every((c) => c.trim().length > 0) && !componentsHaveDuplicates

  const validFieldNames = fields.map((f) => f.name.trim()).filter(Boolean)
  const fieldsHaveDuplicates = new Set(validFieldNames).size !== validFieldNames.length
  const canSaveFields =
    canManage &&
    fields.every(
      (f) => f.name.trim().length > 0 && (f.type !== 'Dropdown' || (f.options?.length ?? 0) > 0),
    ) &&
    !fieldsHaveDuplicates

  function updateComponentName(index: number, name: string) {
    setComponents(components.map((c, i) => (i === index ? name : c)))
  }

  function addComponent() {
    setComponents([...components, ''])
  }

  function removeComponent(index: number) {
    setComponents(components.filter((_, i) => i !== index))
  }

  async function handleSaveComponents() {
    try {
      const saved = await updateComponents.mutateAsync(validComponentNames)
      setComponents(saved.components)
      showToast({ title: 'Components updated', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not update components',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  function updateField(index: number, patch: Partial<EditableCustomField>) {
    setFields(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }

  function addField() {
    setFields([...fields, { name: '', type: 'Text', required: false, options: null }])
  }

  function removeField(index: number) {
    setFields(fields.filter((_, i) => i !== index))
  }

  async function handleSaveFields() {
    try {
      const saved = await updateCustomFields.mutateAsync(fields)
      setFields(saved.customFields)
      showToast({ title: 'Custom fields updated', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not update custom fields',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  if (!canManage) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h3 className="font-medium">Components</h3>
          {components.length === 0 ? (
            <p className="text-sm text-muted-foreground">No components defined.</p>
          ) : (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {components.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-2">
          <h3 className="font-medium">Custom fields</h3>
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No custom fields defined.</p>
          ) : (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {fields.map((f) => (
                <li key={f.id}>
                  {f.name}{' '}
                  <span className="text-xs">
                    ({f.type}
                    {f.required ? ', required' : ''})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Components</h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addComponent}
            className="gap-1"
          >
            <Plus className="h-4 w-4" /> Add component
          </Button>
        </div>

        <div className="space-y-2">
          {components.map((name, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                aria-label={`Component ${index + 1} name`}
                value={name}
                onChange={(e) => updateComponentName(index, e.target.value)}
                placeholder="Component name"
                className="w-48"
              />
              <button
                type="button"
                onClick={() => removeComponent(index)}
                aria-label={`Remove component ${name || index + 1}`}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {componentsHaveDuplicates && (
          <p className="text-sm text-destructive">Component names must be unique.</p>
        )}

        <div className="flex justify-end border-t pt-4">
          <Button
            type="button"
            onClick={() => void handleSaveComponents()}
            loading={updateComponents.isPending}
            disabled={!canSaveComponents}
          >
            Save components
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Custom fields</h3>
          <Button type="button" size="sm" variant="outline" onClick={addField} className="gap-1">
            <Plus className="h-4 w-4" /> Add field
          </Button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={index} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Input
                  aria-label={`Field ${index + 1} name`}
                  value={field.name}
                  onChange={(e) => updateField(index, { name: e.target.value })}
                  placeholder="Field name"
                  className="w-48"
                />
                <Select
                  value={field.type}
                  onValueChange={(v) =>
                    updateField(index, {
                      type: v as CustomFieldType,
                      options: v === 'Dropdown' ? (field.options ?? []) : null,
                    })
                  }
                >
                  <SelectTrigger aria-label={`Field ${index + 1} type`} className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CUSTOM_FIELD_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    aria-label={`Field ${index + 1} required`}
                    checked={field.required}
                    onCheckedChange={(checked) =>
                      updateField(index, { required: checked === true })
                    }
                  />
                  Required
                </label>
                <button
                  type="button"
                  onClick={() => removeField(index)}
                  aria-label={`Remove field ${field.name || index + 1}`}
                  className="ml-auto text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {field.type === 'Dropdown' && (
                <TagInput
                  value={field.options ?? []}
                  onChange={(next) => updateField(index, { options: next })}
                  placeholder="Type an option and press Enter"
                />
              )}
            </div>
          ))}
        </div>

        {fieldsHaveDuplicates && (
          <p className="text-sm text-destructive">Field names must be unique.</p>
        )}

        <div className="flex justify-end border-t pt-4">
          <Button
            type="button"
            onClick={() => void handleSaveFields()}
            loading={updateCustomFields.isPending}
            disabled={!canSaveFields}
          >
            Save custom fields
          </Button>
        </div>
      </div>
    </div>
  )
}
