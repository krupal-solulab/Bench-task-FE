import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { UserSelect } from '@/components/common/UserSelect'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CardSkeleton } from '@/components/common/Skeleton'
import { useTicketMacros } from '@/hooks/queries/useTickets'
import { useUpdateTicketMacros } from '@/hooks/mutations/useTicketMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import {
  TICKET_AUTOMATION_ACTION_TYPES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from '@/types/ticket.types'
import type {
  TicketAutomationAction,
  TicketAutomationActionType,
  TicketMacro,
  TicketMacroVisibility,
} from '@/types/ticket.types'
import { ORG_ROLES } from '@/types/user.types'

export interface TicketMacrosFormProps {
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

type EditableMacro = Partial<Pick<TicketMacro, 'id' | 'createdBy'>> &
  Omit<TicketMacro, 'id' | 'createdBy'>

function emptyAction(): TicketAutomationAction {
  return { type: 'AddTags', value: '' }
}

function emptyMacro(): EditableMacro {
  return { name: '', actions: [emptyAction()], visibility: 'team' }
}

/** BRD 3.3's "Macros" - a named, stored action bundle an agent applies on-demand to one ticket
 * (see the "Apply Macro" control on TicketDetailPage), rather than being matched by a trigger. */
export function TicketMacrosForm({ canManage }: TicketMacrosFormProps) {
  const { data, isLoading } = useTicketMacros()
  const updateMacros = useUpdateTicketMacros()
  const { showToast } = useToast()
  const [macros, setMacros] = useState<EditableMacro[] | null>(null)
  const effective = macros ?? data ?? []

  if (isLoading) return <CardSkeleton />

  const validNames = effective.map((m) => m.name.trim()).filter(Boolean)
  const hasDuplicates = new Set(validNames).size !== validNames.length
  const canSave =
    canManage &&
    !hasDuplicates &&
    effective.every(
      (m) =>
        m.name.trim().length > 0 &&
        m.actions.length > 0 &&
        m.actions.every((a) => a.value.trim().length > 0),
    )

  function update(index: number, patch: Partial<EditableMacro>) {
    setMacros(effective.map((m, i) => (i === index ? { ...m, ...patch } : m)))
  }

  function add() {
    setMacros([...effective, emptyMacro()])
  }

  function remove(index: number) {
    setMacros(effective.filter((_, i) => i !== index))
  }

  function updateAction(
    macroIndex: number,
    actionIndex: number,
    patch: Partial<TicketAutomationAction>,
  ) {
    const macro = effective[macroIndex]!
    const actions = macro.actions.map((a, i) => (i === actionIndex ? { ...a, ...patch } : a))
    update(macroIndex, { actions })
  }

  function addAction(macroIndex: number) {
    const macro = effective[macroIndex]!
    update(macroIndex, { actions: [...macro.actions, emptyAction()] })
  }

  function removeAction(macroIndex: number, actionIndex: number) {
    const macro = effective[macroIndex]!
    update(macroIndex, { actions: macro.actions.filter((_, i) => i !== actionIndex) })
  }

  async function handleSave() {
    try {
      const saved = await updateMacros.mutateAsync(effective)
      setMacros(saved)
      showToast({ title: 'Macros updated', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not update macros',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  if (!canManage) {
    return (
      <div className="space-y-2">
        <h3 className="font-medium">Macros</h3>
        {effective.length === 0 ? (
          <p className="text-sm text-muted-foreground">No macros defined.</p>
        ) : (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {effective.map((m) => (
              <li key={m.id}>
                {m.name} <span className="text-xs">({m.visibility})</span>
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
        <h3 className="font-medium">Macros</h3>
        <Button type="button" size="sm" variant="outline" onClick={add} className="gap-1">
          <Plus className="h-4 w-4" /> Add macro
        </Button>
      </div>

      <div className="space-y-4">
        {effective.map((macro, index) => (
          <div key={macro.id ?? index} className="space-y-3 rounded-md border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                aria-label={`Macro ${index + 1} name`}
                value={macro.name}
                onChange={(e) => update(index, { name: e.target.value })}
                placeholder="Macro name"
                className="w-56"
              />
              <Select
                value={macro.visibility}
                onValueChange={(v) => update(index, { visibility: v as TicketMacroVisibility })}
              >
                <SelectTrigger aria-label={`Macro ${index + 1} visibility`} className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={`Remove macro ${macro.name || index + 1}`}
                className="ml-auto text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Actions
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
              {macro.actions.map((action, actionIndex) => (
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
                      aria-label={`Macro ${index + 1} action ${actionIndex + 1} type`}
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
                        aria-label={`Macro ${index + 1} action ${actionIndex + 1} value`}
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
                        aria-label={`Macro ${index + 1} action ${actionIndex + 1} value`}
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
                      aria-label={`Macro ${index + 1} action ${actionIndex + 1} value`}
                      value={action.value}
                      onChange={(e) => updateAction(index, actionIndex, { value: e.target.value })}
                      placeholder="e.g. resolved"
                      className="w-48"
                    />
                  )}
                  {action.type === 'AddComment' && (
                    <Textarea
                      aria-label={`Macro ${index + 1} action ${actionIndex + 1} value`}
                      value={action.value}
                      onChange={(e) => updateAction(index, actionIndex, { value: e.target.value })}
                      placeholder="Supports {{subject}}, {{ticketKey}}, {{status}}"
                      rows={2}
                      className="w-64"
                    />
                  )}
                  {action.type === 'Webhook' && (
                    <Input
                      aria-label={`Macro ${index + 1} action ${actionIndex + 1} value`}
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
                        aria-label={`Macro ${index + 1} action ${actionIndex + 1} value`}
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
                    aria-label={`Remove macro ${index + 1} action ${actionIndex + 1}`}
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

      {hasDuplicates && <p className="text-sm text-destructive">Macro names must be unique.</p>}

      <div className="flex justify-end border-t pt-4">
        <Button
          type="button"
          onClick={() => void handleSave()}
          loading={updateMacros.isPending}
          disabled={!canSave}
        >
          Save macros
        </Button>
      </div>
    </div>
  )
}
