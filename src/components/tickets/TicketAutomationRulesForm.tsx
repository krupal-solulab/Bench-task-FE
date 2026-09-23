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
import { useTicketAutomationRules } from '@/hooks/queries/useTickets'
import { useUpdateTicketAutomationRules } from '@/hooks/mutations/useTicketMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import {
  TICKET_AUTOMATION_ACTION_TYPES,
  TICKET_AUTOMATION_CONDITION_FIELDS,
  TICKET_AUTOMATION_TRIGGER_TYPES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  CUSTOMER_TIERS,
} from '@/types/ticket.types'
import type {
  TicketAutomationAction,
  TicketAutomationActionType,
  TicketAutomationCondition,
  TicketAutomationConditionField,
  TicketAutomationRule,
  TicketAutomationTriggerType,
} from '@/types/ticket.types'
import { ORG_ROLES } from '@/types/user.types'
import { CardSkeleton } from '@/components/common/Skeleton'

export interface TicketAutomationRulesFormProps {
  canManage: boolean
}

const TRIGGER_LABELS: Record<TicketAutomationTriggerType, string> = {
  TicketCreated: 'Ticket Created',
  TicketStatusChanged: 'Status Changed',
  TicketCommentAdded: 'Comment Added',
  TicketReassigned: 'Reassigned',
}

const ACTION_LABELS: Record<TicketAutomationActionType, string> = {
  SetStatus: 'Set Status',
  SetPriority: 'Set Priority',
  SetAssignee: 'Set Assignee',
  AddTags: 'Add Tag(s)',
  AddComment: 'Add Internal Note',
  NotifyRole: 'Notify Role',
  Webhook: 'Call Webhook',
}

const CONDITION_FIELD_LABELS: Record<TicketAutomationConditionField, string> = {
  Priority: 'Priority',
  Channel: 'Channel',
  CustomerTier: 'Customer Tier',
  Tag: 'Tag',
}

type EditableRule = Partial<Pick<TicketAutomationRule, 'id'>> & Omit<TicketAutomationRule, 'id'>

function emptyAction(): TicketAutomationAction {
  return { type: 'AddTags', value: '' }
}

function emptyCondition(): TicketAutomationCondition {
  return { field: 'Priority', value: '' }
}

function emptyRule(): EditableRule {
  return {
    name: '',
    enabled: true,
    trigger: { type: 'TicketCreated', toStatus: null },
    conditions: [],
    actions: [emptyAction()],
  }
}

/** BRD 3.3's "Triggers" settings form - a "WHEN trigger [IF conditions] THEN actions" rule list,
 * org-wide (not per-project), mirroring AutomationRulesForm's exact shape adapted to ticket
 * fields. */
export function TicketAutomationRulesForm({ canManage }: TicketAutomationRulesFormProps) {
  const { data, isLoading } = useTicketAutomationRules()
  const updateRules = useUpdateTicketAutomationRules()
  const { showToast } = useToast()
  const [rules, setRules] = useState<EditableRule[] | null>(null)
  const effectiveRules = rules ?? data ?? []

  if (isLoading) return <CardSkeleton />

  const validNames = effectiveRules.map((r) => r.name.trim()).filter(Boolean)
  const hasDuplicates = new Set(validNames).size !== validNames.length
  const canSave =
    canManage &&
    !hasDuplicates &&
    effectiveRules.every(
      (r) =>
        r.name.trim().length > 0 &&
        (r.trigger.type !== 'TicketStatusChanged' || !!r.trigger.toStatus) &&
        r.actions.length > 0 &&
        r.actions.every((a) => a.value.trim().length > 0) &&
        r.conditions.every((c) => c.value.trim().length > 0),
    )

  function updateRule(index: number, patch: Partial<EditableRule>) {
    setRules(effectiveRules.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function addRule() {
    setRules([...effectiveRules, emptyRule()])
  }

  function removeRule(index: number) {
    setRules(effectiveRules.filter((_, i) => i !== index))
  }

  function updateCondition(
    ruleIndex: number,
    condIndex: number,
    patch: Partial<TicketAutomationCondition>,
  ) {
    const rule = effectiveRules[ruleIndex]!
    const conditions = rule.conditions.map((c, i) => (i === condIndex ? { ...c, ...patch } : c))
    updateRule(ruleIndex, { conditions })
  }

  function addCondition(ruleIndex: number) {
    const rule = effectiveRules[ruleIndex]!
    updateRule(ruleIndex, { conditions: [...rule.conditions, emptyCondition()] })
  }

  function removeCondition(ruleIndex: number, condIndex: number) {
    const rule = effectiveRules[ruleIndex]!
    updateRule(ruleIndex, { conditions: rule.conditions.filter((_, i) => i !== condIndex) })
  }

  function updateAction(
    ruleIndex: number,
    actionIndex: number,
    patch: Partial<TicketAutomationAction>,
  ) {
    const rule = effectiveRules[ruleIndex]!
    const actions = rule.actions.map((a, i) => (i === actionIndex ? { ...a, ...patch } : a))
    updateRule(ruleIndex, { actions })
  }

  function addAction(ruleIndex: number) {
    const rule = effectiveRules[ruleIndex]!
    updateRule(ruleIndex, { actions: [...rule.actions, emptyAction()] })
  }

  function removeAction(ruleIndex: number, actionIndex: number) {
    const rule = effectiveRules[ruleIndex]!
    updateRule(ruleIndex, { actions: rule.actions.filter((_, i) => i !== actionIndex) })
  }

  async function handleSave() {
    try {
      const saved = await updateRules.mutateAsync(effectiveRules)
      setRules(saved)
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
        <h3 className="font-medium">Trigger rules</h3>
        {effectiveRules.length === 0 ? (
          <p className="text-sm text-muted-foreground">No trigger rules defined.</p>
        ) : (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {effectiveRules.map((r) => (
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
        <h3 className="font-medium">Trigger rules</h3>
        <Button type="button" size="sm" variant="outline" onClick={addRule} className="gap-1">
          <Plus className="h-4 w-4" /> Add rule
        </Button>
      </div>

      <div className="space-y-4">
        {effectiveRules.map((rule, ruleIndex) => (
          <div key={rule.id ?? ruleIndex} className="space-y-3 rounded-md border p-3">
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
                      type: v as TicketAutomationTriggerType,
                      toStatus: v === 'TicketStatusChanged' ? rule.trigger.toStatus : null,
                    },
                  })
                }
              >
                <SelectTrigger aria-label={`Rule ${ruleIndex + 1} trigger`} className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_AUTOMATION_TRIGGER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TRIGGER_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {rule.trigger.type === 'TicketStatusChanged' && (
                <Select
                  value={rule.trigger.toStatus ?? ''}
                  onValueChange={(v) =>
                    updateRule(ruleIndex, { trigger: { type: 'TicketStatusChanged', toStatus: v } })
                  }
                >
                  <SelectTrigger
                    aria-label={`Rule ${ruleIndex + 1} target status`}
                    className="w-36"
                  >
                    <SelectValue placeholder="Status…" />
                  </SelectTrigger>
                  <SelectContent>
                    {TICKET_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                        field: v as TicketAutomationConditionField,
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
                      {TICKET_AUTOMATION_CONDITION_FIELDS.map((f) => (
                        <SelectItem key={f} value={f}>
                          {CONDITION_FIELD_LABELS[f]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <span className="text-sm text-muted-foreground">equals</span>

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
                        {TICKET_PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {condition.field === 'CustomerTier' && (
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
                        {CUSTOMER_TIERS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {(condition.field === 'Channel' || condition.field === 'Tag') && (
                    <Input
                      aria-label={`Rule ${ruleIndex + 1} condition ${condIndex + 1} value`}
                      value={condition.value}
                      onChange={(e) =>
                        updateCondition(ruleIndex, condIndex, { value: e.target.value })
                      }
                      placeholder={condition.field === 'Channel' ? 'e.g. manual' : 'e.g. vip'}
                      className="w-36"
                    />
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
                        type: v as TicketAutomationActionType,
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
                      {TICKET_AUTOMATION_ACTION_TYPES.map((t) => (
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
                        {TICKET_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
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
                        {TICKET_PRIORITIES.map((p) => (
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
                      allowUnassigned={false}
                      placeholder="Assignee…"
                    />
                  )}
                  {action.type === 'AddTags' && (
                    <Input
                      aria-label={`Rule ${ruleIndex + 1} action ${actionIndex + 1} value`}
                      value={action.value}
                      onChange={(e) =>
                        updateAction(ruleIndex, actionIndex, { value: e.target.value })
                      }
                      placeholder="e.g. vip, urgent"
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
                      placeholder="Supports {{subject}}, {{ticketKey}}, {{status}}"
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
          loading={updateRules.isPending}
          disabled={!canSave}
        >
          Save trigger rules
        </Button>
      </div>
    </div>
  )
}
