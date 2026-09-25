import { useState } from 'react'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { CreateProjectRolePayload } from '@/types/project-role.types'

export interface ProjectRoleFormProps {
  initialValues?: { name: string; description: string }
  onSubmit: (values: CreateProjectRolePayload) => Promise<void>
  onCancel: () => void
  submitLabel: string
}

export function ProjectRoleForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel,
}: ProjectRoleFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit({ name: name.trim(), description: description.trim() })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
      <FormField label="Name" htmlFor="project-role-name" required>
        <Input
          id="project-role-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. QA Lead"
        />
      </FormField>

      <FormField label="Description" htmlFor="project-role-description">
        <Textarea
          id="project-role-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What this role is for"
        />
      </FormField>

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
