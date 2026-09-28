import { useState } from 'react'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { TagInput } from '@/components/common/TagInput'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProjects } from '@/hooks/queries/useProjects'
import { TASK_PRIORITIES } from '@/types/task.types'
import type { CreateIssueTemplatePayload, IssueTemplate } from '@/types/issue-template.types'

const ORG_WIDE = '__org_wide__'
const NO_PRIORITY = '__no_priority__'

export interface IssueTemplateFormProps {
  initialValues?: Pick<
    IssueTemplate,
    'name' | 'projectId' | 'issueType' | 'titleTemplate' | 'description' | 'priority' | 'labels'
  >
  onSubmit: (values: CreateIssueTemplatePayload) => Promise<void>
  onCancel: () => void
  submitLabel: string
}

/** customFieldValues is deliberately not editable from this form - it's an opaque, project-
 * specific blob (see issue-template.schema.ts's own doc comment); the API still accepts it, this
 * admin form just doesn't expose a generic editor for it in v1. */
export function IssueTemplateForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel,
}: IssueTemplateFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [projectId, setProjectId] = useState<string | null>(initialValues?.projectId ?? null)
  const [issueType, setIssueType] = useState(initialValues?.issueType ?? 'Task')
  const [titleTemplate, setTitleTemplate] = useState(initialValues?.titleTemplate ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [priority, setPriority] = useState(initialValues?.priority ?? null)
  const [labels, setLabels] = useState<string[]>(initialValues?.labels ?? [])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: projects } = useProjects({ page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' })

  const isValid = name.trim().length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        projectId,
        issueType,
        // Deliberately not trimmed - a trailing space (e.g. "[Bug] ") is often meaningful, the
        // prefix the applied title continues from, not accidental input noise like `name` above.
        titleTemplate,
        description,
        priority,
        labels,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
      <FormField label="Name" htmlFor="it-name" required>
        <Input
          id="it-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Customer-reported bug"
        />
      </FormField>

      <FormField
        label="Project"
        htmlFor="it-project"
        hint="Org-wide (usable when creating an issue in any project), or scoped to one project"
      >
        <Select
          value={projectId ?? ORG_WIDE}
          onValueChange={(v) => setProjectId(v === ORG_WIDE ? null : v)}
        >
          <SelectTrigger id="it-project">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ORG_WIDE}>Org-wide (any project)</SelectItem>
            {(projects?.data ?? []).map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Issue type" htmlFor="it-issue-type">
        <Input
          id="it-issue-type"
          value={issueType}
          onChange={(e) => setIssueType(e.target.value)}
          placeholder="e.g. Bug, Task, Story"
        />
      </FormField>

      <FormField label="Title" htmlFor="it-title-template" hint="Pre-fills the New Task form">
        <Input
          id="it-title-template"
          value={titleTemplate}
          onChange={(e) => setTitleTemplate(e.target.value)}
          placeholder="e.g. [Bug] "
        />
      </FormField>

      <FormField label="Description" htmlFor="it-description">
        <Textarea
          id="it-description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </FormField>

      <FormField label="Priority" htmlFor="it-priority">
        <Select
          value={priority ?? NO_PRIORITY}
          onValueChange={(v) => setPriority(v === NO_PRIORITY ? null : (v as typeof priority))}
        >
          <SelectTrigger id="it-priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_PRIORITY}>No default</SelectItem>
            {TASK_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Labels" htmlFor="it-labels">
        <TagInput id="it-labels" value={labels} onChange={setLabels} placeholder="Add a label…" />
      </FormField>

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
