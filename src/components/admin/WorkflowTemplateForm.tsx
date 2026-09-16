import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { STATUS_CATEGORIES } from '@/types/workflow.types'
import type { Workflow, WorkflowStatus, WorkflowTransition } from '@/types/workflow.types'
import type { WorkflowTemplatePayload } from '@/services/workflowTemplates.service'

const EMPTY_WORKFLOW: Workflow = {
  statuses: [
    { name: 'Todo', category: 'To Do' },
    { name: 'Done', category: 'Done' },
  ],
  transitions: [{ from: 'Todo', to: 'Done' }],
  initialStatus: 'Todo',
}

export interface WorkflowTemplateFormProps {
  initialValues?: { name: string; description: string; workflow: Workflow }
  onSubmit: (values: WorkflowTemplatePayload) => Promise<void>
  onCancel: () => void
  submitLabel: string
}

/** Create/edit form for a Platform-Admin-maintained workflow template: name, description, and the
 * same statuses/transitions shape a project's own workflow uses (`WorkflowSettingsForm`'s List
 * view) - reimplemented here rather than shared, since this form has no project to save against
 * (it POSTs/PATCHes `/workflow-templates`, not `/projects/:id/workflow`) and no Reset action. */
export function WorkflowTemplateForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel,
}: WorkflowTemplateFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [statuses, setStatuses] = useState<WorkflowStatus[]>(
    initialValues?.workflow.statuses ?? EMPTY_WORKFLOW.statuses,
  )
  const [transitions, setTransitions] = useState<WorkflowTransition[]>(
    initialValues?.workflow.transitions ?? EMPTY_WORKFLOW.transitions,
  )
  const [initialStatus, setInitialStatus] = useState(
    initialValues?.workflow.initialStatus ?? EMPTY_WORKFLOW.initialStatus,
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateStatusName(index: number, name: string) {
    const previous = statuses[index]?.name
    setStatuses(statuses.map((s, i) => (i === index ? { ...s, name } : s)))
    setTransitions(
      transitions.map((t) => ({
        ...t,
        from: t.from === previous ? name : t.from,
        to: t.to === previous ? name : t.to,
      })),
    )
    if (initialStatus === previous) setInitialStatus(name)
  }

  function updateStatusCategory(index: number, category: WorkflowStatus['category']) {
    setStatuses(statuses.map((s, i) => (i === index ? { ...s, category } : s)))
  }

  function addStatus() {
    setStatuses([...statuses, { name: '', category: 'To Do' }])
  }

  function removeStatus(index: number) {
    const removed = statuses[index]?.name
    setStatuses(statuses.filter((_, i) => i !== index))
    setTransitions(transitions.filter((t) => t.from !== removed && t.to !== removed))
  }

  function toggleTransition(from: string, to: string, allowed: boolean) {
    if (allowed) {
      setTransitions([...transitions, { from, to }])
    } else {
      setTransitions(transitions.filter((t) => !(t.from === from && t.to === to)))
    }
  }

  const validStatusNames = statuses.map((s) => s.name.trim()).filter(Boolean)
  const hasDuplicates = new Set(validStatusNames).size !== validStatusNames.length
  const canSubmit =
    name.trim().length > 0 &&
    statuses.length > 0 &&
    statuses.every((s) => s.name.trim().length > 0) &&
    !hasDuplicates &&
    validStatusNames.includes(initialStatus)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        workflow: { statuses, transitions, initialStatus },
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
      <FormField label="Name" htmlFor="template-name" required>
        <Input
          id="template-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Bug Tracking"
        />
      </FormField>

      <FormField label="Description" htmlFor="template-description">
        <Input
          id="template-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Todo -> In Progress -> Needs QA -> Done"
        />
      </FormField>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Statuses</h3>
          <Button type="button" size="sm" variant="outline" onClick={addStatus} className="gap-1">
            <Plus className="h-4 w-4" /> Add status
          </Button>
        </div>
        <div className="space-y-2">
          {statuses.map((status, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                aria-label={`Status ${index + 1} name`}
                value={status.name}
                onChange={(e) => updateStatusName(index, e.target.value)}
                placeholder="Status name"
                className="w-48"
              />
              <Select
                value={status.category}
                onValueChange={(v) => updateStatusCategory(index, v as WorkflowStatus['category'])}
              >
                <SelectTrigger aria-label={`Status ${index + 1} category`} className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={() => removeStatus(index)}
                aria-label={`Remove status ${status.name || index + 1}`}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        {hasDuplicates && <p className="text-sm text-destructive">Status names must be unique.</p>}
      </div>

      <FormField label="Initial status" htmlFor="template-initial-status">
        <Select value={initialStatus} onValueChange={setInitialStatus}>
          <SelectTrigger id="template-initial-status" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {validStatusNames.map((n) => (
              <SelectItem key={n} value={n}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Allowed transitions</h3>
        <div className="overflow-x-auto">
          <table className="text-sm">
            <thead>
              <tr>
                <th className="p-2 text-left font-medium text-muted-foreground">From \ To</th>
                {statuses.map((to) => (
                  <th key={to.name} className="p-2 text-center font-medium text-muted-foreground">
                    {to.name || '—'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {statuses.map((from) => (
                <tr key={from.name}>
                  <th className="p-2 text-left font-medium text-muted-foreground">
                    {from.name || '—'}
                  </th>
                  {statuses.map((to) => (
                    <td key={to.name} className="p-2 text-center">
                      {from.name && to.name && from.name !== to.name && (
                        <Checkbox
                          aria-label={`Allow ${from.name} to ${to.name}`}
                          checked={transitions.some(
                            (t) => t.from === from.name && t.to === to.name,
                          )}
                          onCheckedChange={(checked) =>
                            toggleTransition(from.name, to.name, checked === true)
                          }
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting} disabled={!canSubmit}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
