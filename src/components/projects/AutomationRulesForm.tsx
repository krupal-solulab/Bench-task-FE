import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { UserSelect } from '@/components/common/UserSelect'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUpdateAutomationRules } from '@/hooks/mutations/useProjectMutations'
import { useProjectWorkflow } from '@/hooks/queries/useProjects'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import {
  AUTOMATION_ACTION_TYPES,
  AUTOMATION_CONDITION_FIELDS,
  AUTOMATION_TRIGGER_TYPES,
} from '@/types/project.types'
import type {
  AutomationAction,
  AutomationActionType,
  AutomationCondition,
  AutomationConditionField,
  AutomationRule,
  AutomationTriggerType,
  Project,
} from '@/types/project.types'
import { ISSUE_TYPES, TASK_PRIORITIES } from '@/types/task.types'
import { ORG_ROLES } from '@/types/user.types'

export interface AutomationRulesFormProps {
  projectId: string
  project: Project
  canManage: boolean
}

const TRIGGER_LABELS: Record<AutomationTriggerType, string> = {
  IssueCreated: 'Issue Created',
  StatusChanged: 'Status Changed',
  UnassignedForDuration: 'Unassigned For Duration',
  AllSubtasksDone: 'All Sub-tasks Done',
}

const ACTION_LABELS: Record<AutomationActionType, string> = {
  SetStatus: 'Set Status',
  SetPriority: 'Set Priority',
  SetAssignee: 'Set Assignee',
  AddLabels: 'Add Label(s)',
  AddComment: 'Add Comment',
  Webhook: 'Call Webhook',
  NotifyRole: 'Notify Role',
}

const CONDITION_FIELD_LABELS: Record<AutomationConditionField, string> = {
  IssueType: 'Issue Type',
  Priority: 'Priority',
  Component: 'Component',
}

/** A new rule being drafted client-side has no `id` yet - the server assigns one, stable for the
 * rule's lifetime, the first time it's saved. */
type EditableRule = Partial<Pick<AutomationRule, 'id'>> & Omit<AutomationRule, 'id'>

function emptyAction(): AutomationAction {
  // AddLabels is the simplest action to configure (a plain text value, no dependency on the
  // project's workflow/members), so it's the friendliest default for a freshly added action.
  return { type: 'AddLabels', value: '' }
}

function emptyCondition(): AutomationCondition {
  return { field: 'IssueType', value: '' }
}

function emptyRule(): EditableRule {
  return {
    name: '',
    enabled: true,
    trigger: { type: 'IssueCreated', toStatus: null },
    conditions: [],
    actions: [emptyAction()],
  }
}

/** A settings form for a project's "WHEN trigger [IF conditions] THEN actions" automation rules -
 * mirrors FieldsSettingsForm's shape: a list of rule cards, each independently editable, one Save
 * action for the whole list (PUT-replace, matching the Workflow/Components/CustomFields convention). */
export function AutomationRulesForm({ projectId, project, canManage }: AutomationRulesFormProps) {
  const [rules, setRules] = useState<EditableRule[]>(project.automationRules)
  const { data: workflow } = useProjectWorkflow(projectId)
  const updateAutomationRules = useUpdateAutomationRules(projectId)
  const { showToast } = useToast()

  const statusNames = workflow?.statuses.map((s) => s.name) ?? []
  const memberIds = [project.owner.id, ...project.members.map((m) => m.user.id)]

  const validNames = rules.map((r) => r.name.trim()).filter(Boolean)
  const hasDuplicates = new Set(validNames).size !== validNames.length
  const canSave =
    canManage &&
    !hasDuplicates &&
    rules.every(
      (r) =>
        r.name.trim().length > 0 &&
        (r.trigger.type !== 'StatusChanged' || !!r.trigger.toStatus) &&
        (r.trigger.type !== 'UnassignedForDuration' || !!r.trigger.afterHours) &&
        r.actions.length > 0 &&
        r.actions.every((a) => a.value.trim().length > 0) &&
        r.conditions.every((c) => c.value.trim().length > 0),
    )

  function updateRule(index: number, patch: Partial<EditableRule>) {
    setRules(rules.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function addRule() {
    setRules([...rules, emptyRule()])
  }

  function removeRule(index: number) {
    setRules(rules.filter((_, i) => i !== index))
  }

  function updateCondition(
    ruleIndex: number,
    condIndex: number,
    patch: Partial<AutomationCondition>,
  ) {
    const rule = rules[ruleIndex]!
    const conditions = rule.conditions.map((c, i) => (i === condIndex ? { ...c, ...patch } : c))
    updateRule(ruleIndex, { conditions })
  }

  function addCondition(ruleIndex: number) {
    const rule = rules[ruleIndex]!
    updateRule(ruleIndex, { conditions: [...rule.conditions, emptyCondition()] })
  }

  function removeCondition(ruleIndex: number, condIndex: number) {
    const rule = rules[ruleIndex]!
    updateRule(ruleIndex, { conditions: rule.conditions.filter((_, i) => i !== condIndex) })
  }

  function updateAction(ruleIndex: number, actionIndex: number, patch: Partial<AutomationAction>) {
    const rule = rules[ruleIndex]!
    const actions = rule.actions.map((a, i) => (i === actionIndex ? { ...a, ...patch } : a))
    updateRule(ruleIndex, { actions })
  }

  function addAction(ruleIndex: number) {
    const rule = rules[ruleIndex]!
    updateRule(ruleIndex, { actions: [...rule.actions, emptyAction()] })
  }

  function removeAction(ruleIndex: number, actionIndex: number) {
    const rule = rules[ruleIndex]!
    updateRule(ruleIndex, { actions: rule.actions.filter((_, i) => i !== actionIndex) })
  }

  async function handleSave() {
    try {
      const saved = await updateAutomationRules.mutateAsync(rules)
      setRules(saved.automationRules)
      showToast({ title: 'Automation rules updated', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not update automation rules',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  if (!canManage) {
    return (
      <div className="space-y-2">
        <h3 className="font-medium">Automation rules</h3>
        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">No automation rules defined.</p>
        ) : (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {rules.map((r) => (
              <li key={r.id}>
                {r.name}{' '}
                <span className="text-xs">
                  ({TRIGGER_LABELS[r.trigger.type]}
                  {!r.enabled ? ', disabled' : ''})
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Automation rules</h3>
        <Button type="button" size="sm" variant="outline" onClick={addRule} className="gap-1">
          <Plus className="h-4 w-4" /> Add rule
        </Button>
      </div>

      <div className="space-y-4">
        {rules.map((rule, ruleIndex) => (
          <div key={ruleIndex} className="space-y-3 rounded-md border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                aria-label={`Rule ${ruleIndex + 1} name`}
                value={rule.name}
                onChange={(e) => updateRule(ruleIndex, { name: e.target.value })}
                placeholder="Rule name"
                className="w-56"
              />
              <label className="flex items-center gap-1.5 text-sm">
                <Checkbox
                  aria-label={`Rule ${ruleIndex + 1} enabled`}
                  checked={rule.enabled}
                  onCheckedChange={(checked) =>
                    updateRule(ruleIndex, { enabled: checked === true })
                  }
                />
                Enabled
              </label>
              <button
                type="button"
                onClick={() => removeRule(ruleIndex)}
                aria-label={`Remove rule ${rule.name || ruleIndex + 1}`}
                className="ml-auto text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">When</span>
              <Select
                value={rule.trigger.type}
                onValueChange={(v) =>
                  updateRule(ruleIndex, {
                    trigger: {
                      type: v as AutomationTriggerType,
                      toStatus: v === 'StatusChanged' ? rule.trigger.toStatus : null,
                      afterHours: v === 'UnassignedForDuration' ? rule.trigger.afterHours : null,
                    },
                  })
                }
              >
                <SelectTrigger aria-label={`Rule ${ruleIndex + 1} trigger`} className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUTOMATION_TRIGGER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TRIGGER_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {rule.trigger.type === 'StatusChanged' && (
                <Select
                  value={rule.trigger.toStatus ?? ''}
                  onValueChange={(v) =>
                    updateRule(ruleIndex, { trigger: { type: 'StatusChanged', toStatus: v } })
                  }
                >
                  <SelectTrigger
                    aria-label={`Rule ${ruleIndex + 1} target status`}
                    className="w-36"
                  >
                    <SelectValue placeholder="Status…" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusNames.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {rule.trigger.type === 'UnassignedForDuration' && (
                <div className="flex items-center gap-1.5">
                  <Input
                    aria-label={`Rule ${ruleIndex + 1} after hours`}
                    type="number"
                    min={1}
                    value={rule.trigger.afterHours ?? ''}
                    onChange={(e) =>
                      updateRule(ruleIndex, {
                        trigger: {
                          type: 'UnassignedForDuration',
                          toStatus: null,
                          afterHours: e.target.value ? Number(e.target.value) : null,
                        },
                      })
                    }
                    placeholder="Hours"
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">hours unassigned</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  If (optional - empty always matches)
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => addCondition(ruleIndex)}
                  className="h-7 gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Condition
                </Button>
              </div>
              {rule.conditions.map((condition, condIndex) => (
                <div key={condIndex} className="flex items-center gap-2">
                  <Select
                    value={condition.field}
                    onValueChange={(v) =>
                      updateCondition(ruleIndex, condIndex, {
                        field: v as AutomationConditionField,
                        value: '',
                      })
                    }
                  >
                    <SelectTrigger
                      aria-label={`Rule ${ruleIndex + 1} condition ${condIndex + 1} field`}
                      className="w-32"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUTOMATION_CONDITION_FIELDS.map((f) => (
                        <SelectItem key={f} value={f}>
                          {CONDITION_FIELD_LABELS[f]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <span className="text-sm text-muted-foreground">equals</span>

                  {condition.field === 'IssueType' && (
                    <Select
                      value={condition.value}
                      onValueChange={(v) => updateCondition(ruleIndex, condIndex, { value: v })}
                    >
                      <SelectTrigger
                        aria-label={`Rule ${ruleIndex + 1} condition ${condIndex + 1} value`}
                        className="w-36"
                      >
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        {ISSUE_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {condition.field === 'Priority' && (
                    <Select
                      value={condition.value}
                      onValueChange={(v) => updateCondition(ruleIndex, condIndex, { value: v })}
                    >
                      <SelectTrigger
                        aria-label={`Rule ${ruleIndex + 1} condition ${condIndex + 1} value`}
                        className="w-36"
                      >
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {condition.field === 'Component' && (
                    <Select
                      value={condition.value}
                      onValueChange={(v) => updateCondition(ruleIndex, condIndex, { value: v })}
                    >
                      <SelectTrigger
                        aria-label={`Rule ${ruleIndex + 1} condition ${condIndex + 1} value`}
                        className="w-36"
                      >
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        {project.components.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <button
                    type="button"
                    onClick={() => removeCondition(ruleIndex, condIndex)}
                    aria-label={`Remove rule ${ruleIndex + 1} condition ${condIndex + 1}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Then
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => addAction(ruleIndex)}
                  className="h-7 gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Action
                </Button>
              </div>
              {rule.actions.map((action, actionIndex) => (
                <div key={actionIndex} className="flex items-center gap-2">
                  <Select
                    value={action.type}
                    onValueChange={(v) =>
                      updateAction(ruleIndex, actionIndex, {
                        type: v as AutomationActionType,
                        value: '',
                      })
                    }
                  >
                    <SelectTrigger
                      aria-label={`Rule ${ruleIndex + 1} action ${actionIndex + 1} type`}
                      className="w-36"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUTOMATION_ACTION_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {ACTION_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {action.type === 'SetStatus' && (
                    <Select
                      value={action.value}
                      onValueChange={(v) => updateAction(ruleIndex, actionIndex, { value: v })}
                    >
                      <SelectTrigger
                        aria-label={`Rule ${ruleIndex + 1} action ${actionIndex + 1} value`}
                        className="w-36"
                      >
                        <SelectValue placeholder="Status…" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusNames.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {action.type === 'SetPriority' && (
                    <Select
                      value={action.value}
                      onValueChange={(v) => updateAction(ruleIndex, actionIndex, { value: v })}
                    >
                      <SelectTrigger
                        aria-label={`Rule ${ruleIndex + 1} action ${actionIndex + 1} value`}
                        className="w-36"
                      >
                        <SelectValue placeholder="Priority…" />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {action.type === 'SetAssignee' && (
                    <UserSelect
                      value={action.value || null}
                      onChange={(v) => updateAction(ruleIndex, actionIndex, { value: v ?? '' })}
                      memberIds={memberIds}
                      allowUnassigned={false}
                      placeholder="Assignee…"
                    />
                  )}
                  {action.type === 'AddLabels' && (
                    <Input
                      aria-label={`Rule ${ruleIndex + 1} action ${actionIndex + 1} value`}
                      value={action.value}
                      onChange={(e) =>
                        updateAction(ruleIndex, actionIndex, { value: e.target.value })
                      }
                      placeholder="e.g. bug, urgent"
                      className="w-48"
                    />
                  )}
                  {action.type === 'AddComment' && (
                    <Textarea
                      aria-label={`Rule ${ruleIndex + 1} action ${actionIndex + 1} value`}
                      value={action.value}
                      onChange={(e) =>
                        updateAction(ruleIndex, actionIndex, { value: e.target.value })
                      }
                      placeholder="Supports {{title}}, {{issueKey}}, {{status}}"
                      rows={2}
                      className="w-64"
                    />
                  )}
                  {action.type === 'Webhook' && (
                    <Input
                      aria-label={`Rule ${ruleIndex + 1} action ${actionIndex + 1} value`}
                      type="url"
                      value={action.value}
                      onChange={(e) =>
                        updateAction(ruleIndex, actionIndex, { value: e.target.value })
                      }
                      placeholder="https://example.com/hook"
                      className="w-64"
                    />
                  )}
                  {action.type === 'NotifyRole' && (
                    <Select
                      value={action.value}
                      onValueChange={(v) => updateAction(ruleIndex, actionIndex, { value: v })}
                    >
                      <SelectTrigger
                        aria-label={`Rule ${ruleIndex + 1} action ${actionIndex + 1} value`}
                        className="w-36"
                      >
                        <SelectValue placeholder="Role…" />
                      </SelectTrigger>
                      <SelectContent>
                        {ORG_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <button
                    type="button"
                    onClick={() => removeAction(ruleIndex, actionIndex)}
                    aria-label={`Remove rule ${ruleIndex + 1} action ${actionIndex + 1}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {hasDuplicates && <p className="text-sm text-destructive">Rule names must be unique.</p>}

      <div className="flex justify-end border-t pt-4">
        <Button
          type="button"
          onClick={() => void handleSave()}
          loading={updateAutomationRules.isPending}
          disabled={!canSave}
        >
          Save automation rules
        </Button>
      </div>
    </div>
  )
}
