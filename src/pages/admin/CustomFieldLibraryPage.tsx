import { useState, type FormEvent } from 'react'
import { Library, Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { FormField } from '@/components/common/FormField'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCustomFieldLibrary } from '@/hooks/queries/useCustomFieldLibrary'
import {
  useCreateLibraryField,
  useDeleteLibraryField,
  useUpdateLibraryField,
} from '@/hooks/mutations/useCustomFieldLibraryMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import { CUSTOM_FIELD_TYPES, type CustomFieldType } from '@/types/project.types'
import type {
  CreateLibraryFieldPayload,
  CustomFieldLibraryEntry,
} from '@/types/custom-field-library.types'

const hasOptions = (type: CustomFieldType) => type === 'Dropdown' || type === 'MultiSelect'

interface LibraryFieldFormProps {
  /** Editing never changes the type - it's fixed for life, like a project field's. */
  editing?: CustomFieldLibraryEntry
  onSubmit: (values: CreateLibraryFieldPayload) => Promise<void>
  onCancel: () => void
}

function LibraryFieldForm({ editing, onSubmit, onCancel }: LibraryFieldFormProps) {
  const [name, setName] = useState(editing?.name ?? '')
  const [type, setType] = useState<CustomFieldType>(editing?.type ?? 'Text')
  const [optionsText, setOptionsText] = useState((editing?.options ?? []).join('\n'))
  const [description, setDescription] = useState(editing?.description ?? '')
  const [submitting, setSubmitting] = useState(false)

  const options = optionsText
    .split('\n')
    .map((o) => o.trim())
    .filter(Boolean)
  const invalid = !name.trim() || (hasOptions(type) && options.length === 0)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (invalid) return
    setSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        type,
        description,
        ...(hasOptions(type) ? { options } : {}),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <FormField label="Name" htmlFor="library-field-name" required>
        <Input
          id="library-field-name"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
        />
      </FormField>
      <FormField
        label="Type"
        htmlFor="library-field-type"
        hint={editing ? "A field's type can't change after creation." : undefined}
      >
        <Select
          value={type}
          onValueChange={(v) => setType(v as CustomFieldType)}
          disabled={!!editing}
        >
          <SelectTrigger id="library-field-type">
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
      </FormField>
      {hasOptions(type) && (
        <FormField label="Options (one per line)" htmlFor="library-field-options" required>
          <Textarea
            id="library-field-options"
            rows={4}
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
          />
        </FormField>
      )}
      <FormField label="Description" htmlFor="library-field-description">
        <Textarea
          id="library-field-description"
          rows={2}
          maxLength={500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </FormField>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting} disabled={invalid}>
          {editing ? 'Save changes' : 'Create field'}
        </Button>
      </div>
    </form>
  )
}

/** Module 8 gap-closure - the org-wide custom field library (cross-project field config). */
export function CustomFieldLibraryPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<CustomFieldLibraryEntry | null>(null)
  const [deleting, setDeleting] = useState<CustomFieldLibraryEntry | null>(null)

  const { data: entries, isLoading } = useCustomFieldLibrary()
  const createField = useCreateLibraryField()
  const updateField = useUpdateLibraryField(editing?.id ?? '')
  const deleteField = useDeleteLibraryField()
  const { showToast } = useToast()

  async function run(action: () => Promise<unknown>, success: string, failure: string) {
    try {
      await action()
      showToast({ title: success, variant: 'success' })
      return true
    } catch (err) {
      showToast({ title: failure, description: toApiError(err).message, variant: 'destructive' })
      return false
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Custom field library"
        description="Define a field once and add it to any project - it keeps the same identity everywhere, so values and filters line up across projects"
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" /> New field
          </Button>
        }
      />

      {!isLoading && (entries ?? []).length === 0 && (
        <EmptyState
          icon={Library}
          title="No library fields yet"
          description="Create a field, then add it from any project's Fields settings tab."
          actionLabel="New field"
          onAction={() => setCreateOpen(true)}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(entries ?? []).map((entry) => (
          <div key={entry.id} className="space-y-1 rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{entry.name}</p>
                <p className="text-xs text-muted-foreground">
                  {entry.type}
                  {entry.options?.length ? ` · ${entry.options.join(', ')}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditing(entry)}
                  aria-label={`Edit ${entry.name}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(entry)}
                  aria-label={`Delete ${entry.name}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {entry.description && (
              <p className="text-xs text-muted-foreground">{entry.description}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Used by {entry.projectCount} project{entry.projectCount === 1 ? '' : 's'}
            </p>
          </div>
        ))}
      </div>

      <Modal open={createOpen} onOpenChange={setCreateOpen} title="New library field">
        <LibraryFieldForm
          onSubmit={async (values) => {
            if (
              await run(
                () => createField.mutateAsync(values),
                'Library field created',
                'Could not create field',
              )
            ) {
              setCreateOpen(false)
            }
          }}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>

      <Modal
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        title={`Edit "${editing?.name ?? ''}"`}
      >
        {editing && (
          <LibraryFieldForm
            editing={editing}
            onSubmit={async ({ type: _type, ...values }) => {
              if (
                await run(
                  () => updateField.mutateAsync(values),
                  'Library field updated in every project that uses it',
                  'Could not update field',
                )
              ) {
                setEditing(null)
              }
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete library field"
        description={`Delete "${deleting?.name ?? ''}"? A field still used by a project can't be deleted.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (deleting) {
            await run(
              () => deleteField.mutateAsync(deleting.id),
              'Library field deleted',
              'Could not delete field',
            )
          }
        }}
      />
    </div>
  )
}
