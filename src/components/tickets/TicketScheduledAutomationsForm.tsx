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
import { CardSkeleton } from '@/components/common/Skeleton'
import { useTicketScheduledAutomations } from '@/hooks/queries/useTickets'
import { useUpdateTicketScheduledAutomations } from '@/hooks/mutations/useTicketMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import {
  CUSTOMER_TIERS,
  TICKET_AUTOMATION_ACTION_TYPES,
  TICKET_AUTOMATION_CONDITION_FIELDS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from '@/types/ticket.types'
import type {
  TicketAutomationAction,
  TicketAutomationActionType,
  TicketAutomationCondition,
  TicketAutomationConditionField,
  TicketScheduledAutomation,
  TicketStatus,
} from '@/types/ticket.types'
import { ORG_ROLES } from '@/types/user.types'

export interface TicketScheduledAutomationsFormProps {
  canManage: boolean
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

type EditableAutomation = Partial<Pick<TicketScheduledAutomation, 'id'>> &
  Omit<TicketScheduledAutomation, 'id'>

function emptyAction(): TicketAutomationAction {
  return { type: 'AddTags', value: '' }
}

function emptyCondition(): TicketAutomationCondition {
  return { field: 'Priority', value: '' }
}

function emptyAutomation(): EditableAutomation {
  return {
    name: '',
    enabled: true,
    matchStatus: 'Pending' as TicketStatus,
    afterHours: 72,
    conditions: [],
    actions: [emptyAction()],
  }
}

/** BRD 3.3's time-based "Automations" (e.g. "Pending 3 days -> auto-close") - checked by an hourly
 * sweep rather than firing on an immediate event, so each entry names the status a ticket must
 * currently be in (matchStatus) and how many hours it must have been there (afterHours). */
export function TicketScheduledAutomationsForm({ canManage }: TicketScheduledAutomationsFormProps) {
  const { data, isLoading } = useTicketScheduledAutomations()
  const updateAutomations = useUpdateTicketScheduledAutomations()
  const { showToast } = useToast()
  const [automations, setAutomations] = useState<EditableAutomation[] | null>(null)
  const effective = automations ?? data ?? []

  if (isLoading) return <CardSkeleton />

  const validNames = effective.map((a) => a.name.trim()).filter(Boolean)
  const hasDuplicates = new Set(validNames).size !== validNames.length
  const canSave =
    canManage &&
    !hasDuplicates &&
    effective.every(
      (a) =>
        a.name.trim().length > 0 &&
        a.afterHours > 0 &&
        a.actions.length > 0 &&
        a.actions.every((act) => act.value.trim().length > 0) &&
        a.conditions.every((c) => c.value.trim().length > 0),
    )

  function update(index: number, patch: Partial<EditableAutomation>) {
    setAutomations(effective.map((a, i) => (i === index ? { ...a, ...patch } : a)))
  }

  function add() {
    setAutomations([...effective, emptyAutomation()])
  }

  function remove(index: number) {
    setAutomations(effective.filter((_, i) => i !== index))
  }

  function updateCondition(
    autoIndex: number,
    condIndex: number,
    patch: Partial<TicketAutomationCondition>,
  ) {
    const automation = effective[autoIndex]!
    const conditions = automation.conditions.map((c, i) =>
      i === condIndex ? { ...c, ...patch } : c,
    )
    update(autoIndex, { conditions })
  }

  function addCondition(autoIndex: number) {
    const automation = effective[autoIndex]!
    update(autoIndex, { conditions: [...automation.conditions, emptyCondition()] })
  }

  function removeCondition(autoIndex: number, condIndex: number) {
    const automation = effective[autoIndex]!
    update(autoIndex, { conditions: automation.conditions.filter((_, i) => i !== condIndex) })
  }

  function updateAction(
    autoIndex: number,
    actionIndex: number,
    patch: Partial<TicketAutomationAction>,
  ) {
    const automation = effective[autoIndex]!
    const actions = automation.actions.map((a, i) => (i === actionIndex ? { ...a, ...patch } : a))
    update(autoIndex, { actions })
  }

  function addAction(autoIndex: number) {
    const automation = effective[autoIndex]!
    update(autoIndex, { actions: [...automation.actions, emptyAction()] })
  }

  function removeAction(autoIndex: number, actionIndex: number) {
    const automation = effective[autoIndex]!
    update(autoIndex, { actions: automation.actions.filter((_, i) => i !== actionIndex) })
  }

  async function handleSave() {
    try {
      const saved = await updateAutomations.mutateAsync(effective)
      setAutomations(saved)
      showToast({ title: 'Scheduled automations updated', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not update scheduled automations',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  if (!canManage) {
    return (
      <div className="space-y-2">
        <h3 className="font-medium">Scheduled automations</h3>
        {effective.length === 0 ? (
          <p className="text-sm text-muted-foreground">No scheduled automations defined.</p>
        ) : (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {effective.map((a) => (
              <li key={a.id}>
                {a.name}{' '}
                <span className="text-xs">
                  ({a.matchStatus} for {a.afterHours}h{!a.enabled ? ', disabled' : ''})
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
        <div>
          <h3 className="font-medium">Scheduled automations</h3>
          <p className="text-sm text-muted-foreground">
            Checked hourly against every ticket currently sitting in the named status.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={add} className="gap-1">
          <Plus className="h-4 w-4" /> Add automation
        </Button>
      </div>

      <div className="space-y-4">
        {effective.map((automation, index) => (
          <div key={automation.id ?? index} className="space-y-3 rounded-md border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                aria-label={`Automation ${index + 1} name`}
                value={automation.name}
                onChange={(e) => update(index, { name: e.target.value })}
                placeholder="Automation name"
                className="w-56"
              />
              <label className="flex items-center gap-1.5 text-sm">
                <Checkbox
                  aria-label={`Automation ${index + 1} enabled`}
                  checked={automation.enabled}
                  onCheckedChange={(checked) => update(index, { enabled: checked === true })}
                />
                Enabled
              </label>
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={`Remove automation ${automation.name || index + 1}`}
                className="ml-auto text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">When a ticket has been in</span>
              <Select
                value={automation.matchStatus}
                onValueChange={(v) => update(index, { matchStatus: v as TicketStatus })}
              >
                <SelectTrigger aria-label={`Automation ${index + 1} match status`} className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground">for at least</span>
              <Input
                aria-label={`Automation ${index + 1} after hours`}
                type="number"
                min={1}
                value={automation.afterHours}
                onChange={(e) => update(index, { afterHours: Number(e.target.value) })}
                className="w-20"
              />
              <span className="text-muted-foreground">hours</span>
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
                  onClick={() => addCondition(index)}
                  className="h-7 gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Condition
                </Button>
              </div>
              {automation.conditions.map((condition, condIndex) => (
                <div key={condIndex} className="flex items-center gap-2">
                  <Select
                    value={condition.field}
                    onValueChange={(v) =>
                      updateCondition(index, condIndex, {
                        field: v as TicketAutomationConditionField,
                        value: '',
                      })
                    }
                  >
                    <SelectTrigger
                      aria-label={`Automation ${index + 1} condition ${condIndex + 1} field`}
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
                      onValueChange={(v) => updateCondition(index, condIndex, { value: v })}
                    >
                      <SelectTrigger
                        aria-label={`Automation ${index + 1} condition ${condIndex + 1} value`}
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
                      onValueChange={(v) => updateCondition(index, condIndex, { value: v })}
                    >
                      <SelectTrigger
                        aria-label={`Automation ${index + 1} condition ${condIndex + 1} value`}
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
                      aria-label={`Automation ${index + 1} condition ${condIndex + 1} value`}
                      value={condition.value}
                      onChange={(e) => updateCondition(index, condIndex, { value: e.target.value })}
                      className="w-36"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeCondition(index, condIndex)}
                    aria-label={`Remove automation ${index + 1} condition ${condIndex + 1}`}
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
                  onClick={() => addAction(index)}
                  className="h-7 gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Action
                </Button>
              </div>
              {automation.actions.map((action, actionIndex) => (
                <div key={actionIndex} className="flex items-center gap-2">
                  <Select
                    value={action.type}
                    onValueChange={(v) =>
                      updateAction(index, actionIndex, {
                        type: v as TicketAutomationActionType,
                        value: '',
                      })
                    }
                  >
                    <SelectTrigger
                      aria-label={`Automation ${index + 1} action ${actionIndex + 1} type`}
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
                      onValueChange={(v) => updateAction(index, actionIndex, { value: v })}
                    >
                      <SelectTrigger
                        aria-label={`Automation ${index + 1} action ${actionIndex + 1} value`}
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
                      onValueChange={(v) => updateAction(index, actionIndex, { value: v })}
                    >
                      <SelectTrigger
                        aria-label={`Automation ${index + 1} action ${actionIndex + 1} value`}
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
                      onChange={(v) => updateAction(index, actionIndex, { value: v ?? '' })}
                      allowUnassigned={false}
                      placeholder="Assignee…"
                    />
                  )}
                  {action.type === 'AddTags' && (
                    <Input
                      aria-label={`Automation ${index + 1} action ${actionIndex + 1} value`}
                      value={action.value}
                      onChange={(e) => updateAction(index, actionIndex, { value: e.target.value })}
                      placeholder="e.g. stale"
                      className="w-48"
                    />
                  )}
                  {action.type === 'AddComment' && (
                    <Textarea
                      aria-label={`Automation ${index + 1} action ${actionIndex + 1} value`}
                      value={action.value}
                      onChange={(e) => updateAction(index, actionIndex, { value: e.target.value })}
                      placeholder="Supports {{subject}}, {{ticketKey}}, {{status}}"
                      rows={2}
                      className="w-64"
                    />
                  )}
                  {action.type === 'Webhook' && (
                    <Input
                      aria-label={`Automation ${index + 1} action ${actionIndex + 1} value`}
                      type="url"
                      value={action.value}
                      onChange={(e) => updateAction(index, actionIndex, { value: e.target.value })}
                      placeholder="https://example.com/hook"
                      className="w-64"
                    />
                  )}
                  {action.type === 'NotifyRole' && (
                    <Select
                      value={action.value}
                      onValueChange={(v) => updateAction(index, actionIndex, { value: v })}
                    >
                      <SelectTrigger
                        aria-label={`Automation ${index + 1} action ${actionIndex + 1} value`}
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
                    onClick={() => removeAction(index, actionIndex)}
                    aria-label={`Remove automation ${index + 1} action ${actionIndex + 1}`}
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

      {hasDuplicates && (
        <p className="text-sm text-destructive">Automation names must be unique.</p>
      )}

      <div className="flex justify-end border-t pt-4">
        <Button
          type="button"
          onClick={() => void handleSave()}
          loading={updateAutomations.isPending}
          disabled={!canSave}
        >
          Save scheduled automations
        </Button>
      </div>
    </div>
  )
}
