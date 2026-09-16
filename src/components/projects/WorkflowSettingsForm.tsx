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
import { useResetWorkflow, useUpdateWorkflow } from '@/hooks/mutations/useProjectMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import { STATUS_CATEGORIES } from '@/types/workflow.types'
import type { Workflow, WorkflowStatus, WorkflowTransition } from '@/types/workflow.types'
import { ORG_ROLES } from '@/types/user.types'
import type { OrgRole } from '@/types/user.types'

export interface WorkflowSettingsFormProps {
  projectId: string
  workflow: Workflow
  canManage: boolean
  /** When set, this form reads/writes that issue type's workflow override instead of the
   * project-wide default (Workflow Engine v2's per-issue-type workflows). Omit for the default. */
  issueType?: string
}

/** A settings form for a project's custom workflow: its status list (name + category) and the
 * legal from->to moves between them. Not a visual builder - a plain form covers the same
 * capability (custom statuses, custom transitions) with far less UI complexity/risk. */
export function WorkflowSettingsForm({
  projectId,
  workflow,
  canManage,
  issueType,
}: WorkflowSettingsFormProps) {
  const [statuses, setStatuses] = useState<WorkflowStatus[]>(workflow.statuses)
  const [transitions, setTransitions] = useState<WorkflowTransition[]>(workflow.transitions)
  const [initialStatus, setInitialStatus] = useState(workflow.initialStatus)

  const updateWorkflow = useUpdateWorkflow(projectId, issueType)
  const resetWorkflow = useResetWorkflow(projectId, issueType)
  const { showToast } = useToast()

  function applyWorkflow(next: Workflow) {
    setStatuses(next.statuses)
    setTransitions(next.transitions)
    setInitialStatus(next.initialStatus)
  }

  function updateStatusName(index: number, name: string) {
    const previous = statuses[index]?.name
    setStatuses(statuses.map((s, i) => (i === index ? { ...s, name } : s)))
    setTransitions(
      transitions.map((t) => ({
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

  function updateTransitionRule(
    from: string,
    to: string,
    patch: Partial<Pick<WorkflowTransition, 'allowedRoles' | 'requireComment'>>,
  ) {
    setTransitions(
      transitions.map((t) => (t.from === from && t.to === to ? { ...t, ...patch } : t)),
    )
  }

  function toggleAllowedRole(from: string, to: string, role: OrgRole, checked: boolean) {
    const current = transitions.find((t) => t.from === from && t.to === to)?.allowedRoles ?? []
    const next = checked ? [...current, role] : current.filter((r) => r !== role)
    updateTransitionRule(from, to, { allowedRoles: next.length ? next : undefined })
  }

  const validStatusNames = statuses.map((s) => s.name.trim()).filter(Boolean)
  const hasDuplicates = new Set(validStatusNames).size !== validStatusNames.length
  const canSave =
    canManage &&
    statuses.length > 0 &&
    statuses.every((s) => s.name.trim().length > 0) &&
    !hasDuplicates &&
    validStatusNames.includes(initialStatus)

  async function handleSave() {
    try {
      const saved = await updateWorkflow.mutateAsync({ statuses, transitions, initialStatus })
      applyWorkflow(saved)
      showToast({ title: 'Workflow updated', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not update workflow',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleReset() {
    try {
      const reset = await resetWorkflow.mutateAsync()
      applyWorkflow(reset)
      showToast({ title: 'Workflow reset to the system default', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not reset workflow',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  if (!canManage) {
    return (
      <div className="space-y-3">
        <h3 className="font-medium">Statuses</h3>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {statuses.map((s) => (
            <li key={s.name}>
              {s.name} <span className="text-xs">({s.category})</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Statuses</h3>
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

      <FormField label="Initial status" htmlFor="workflow-initial-status">
        <Select value={initialStatus} onValueChange={setInitialStatus}>
          <SelectTrigger id="workflow-initial-status" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {validStatusNames.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <div className="space-y-2">
        <h3 className="font-medium">Allowed transitions</h3>
        <p className="text-xs text-muted-foreground">
          Check every status move that should be allowed, from the row's status to the column's
          status.
        </p>
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

      {transitions.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium">Transition rules</h3>
          <p className="text-xs text-muted-foreground">
            Optionally restrict who can make a transition (Condition) or require a comment on the
            task first (Validator). Leave unrestricted for no gating.
          </p>
          <div className="space-y-3">
            {transitions.map((t) => (
              <div key={`${t.from}->${t.to}`} className="rounded border p-3">
                <p className="mb-2 text-sm font-medium">
                  {t.from} → {t.to}
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">Allowed roles:</span>
                    {ORG_ROLES.map((role) => (
                      <label
                        key={role}
                        className="flex items-center gap-1 text-xs"
                        htmlFor={`transition-role-${t.from}-${t.to}-${role}`}
                      >
                        <Checkbox
                          id={`transition-role-${t.from}-${t.to}-${role}`}
                          aria-label={`Allow ${role} to make ${t.from} to ${t.to}`}
                          checked={t.allowedRoles?.includes(role) ?? false}
                          onCheckedChange={(checked) =>
                            toggleAllowedRole(t.from, t.to, role, checked === true)
                          }
                        />
                        {role}
                      </label>
                    ))}
                  </div>
                  <label
                    className="flex items-center gap-1 text-xs"
                    htmlFor={`transition-comment-${t.from}-${t.to}`}
                  >
                    <Checkbox
                      id={`transition-comment-${t.from}-${t.to}`}
                      aria-label={`Require a comment before ${t.from} to ${t.to}`}
                      checked={t.requireComment ?? false}
                      onCheckedChange={(checked) =>
                        updateTransitionRule(t.from, t.to, { requireComment: checked === true })
                      }
                    />
                    Require a comment first
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleReset()}
          loading={resetWorkflow.isPending}
        >
          Reset to default
        </Button>
        <Button
          type="button"
          onClick={() => void handleSave()}
          loading={updateWorkflow.isPending}
          disabled={!canSave}
        >
          Save workflow
        </Button>
      </div>
    </div>
  )
}
