import { useState } from 'react'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { CreateCannedResponsePayload } from '@/types/canned-response.types'

export interface CannedResponseFormProps {
  initialValues?: { title: string; body: string }
  onSubmit: (values: CreateCannedResponsePayload) => Promise<void>
  onCancel: () => void
  submitLabel: string
}

export function CannedResponseForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel,
}: CannedResponseFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [body, setBody] = useState(initialValues?.body ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit({ title: title.trim(), body: body.trim() })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
      <FormField label="Title" htmlFor="canned-response-title" required>
        <Input
          id="canned-response-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={60}
          placeholder="e.g. Investigating"
        />
      </FormField>
      <FormField label="Response" htmlFor="canned-response-body" required>
        <Textarea
          id="canned-response-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="Thanks for reporting this - we're looking into it now."
        />
      </FormField>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting} disabled={!title.trim() || !body.trim()}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
