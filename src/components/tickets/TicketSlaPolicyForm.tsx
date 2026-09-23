import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/ui/input'
import { UserSelect } from '@/components/common/UserSelect'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CardSkeleton } from '@/components/common/Skeleton'
import { useTicketSlaPolicy } from '@/hooks/queries/useTickets'
import { useUpdateTicketSlaPolicy } from '@/hooks/mutations/useTicketMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import { CUSTOMER_TIERS, TICKET_PRIORITIES } from '@/types/ticket.types'
import type { CustomerTier, TicketPriority, TicketSlaPolicyEntry } from '@/types/ticket.types'

export interface TicketSlaPolicyFormProps {
  canManage: boolean
}

const ANY_VALUE = '__any__'

function emptyEntry(): TicketSlaPolicyEntry {
  return {
    priority: 'Normal',
    customerTier: null,
    channel: null,
    firstResponseHours: 8,
    resolutionHours: 24,
    escalationChain: [],
  }
}

/** BRD 3.4's Advanced SLA policy - keyed by priority x customerTier x channel (the latter two
 * optional "any" wildcards), each entry carrying an ordered escalation chain notified before a
 * hard breach. Generalizes the project-level SlaPolicySettingsForm's simpler priority-only shape. */
export function TicketSlaPolicyForm({ canManage }: TicketSlaPolicyFormProps) {
  const { data, isLoading } = useTicketSlaPolicy()
  const updatePolicy = useUpdateTicketSlaPolicy()
  const { showToast } = useToast()
  const [entries, setEntries] = useState<TicketSlaPolicyEntry[] | null>(null)
  const effective = entries ?? data ?? []

  if (isLoading) return <CardSkeleton />

  const canSave =
    canManage && effective.every((e) => e.firstResponseHours > 0 && e.resolutionHours > 0)

  function update(index: number, patch: Partial<TicketSlaPolicyEntry>) {
    setEntries(effective.map((e, i) => (i === index ? { ...e, ...patch } : e)))
  }

  function add() {
    setEntries([...effective, emptyEntry()])
  }

  function remove(index: number) {
    setEntries(effective.filter((_, i) => i !== index))
  }

  function addEscalation(index: number, userId: string) {
    const entry = effective[index]!
    if (entry.escalationChain.includes(userId)) return
    update(index, { escalationChain: [...entry.escalationChain, userId] })
  }

  function removeEscalation(index: number, userId: string) {
    const entry = effective[index]!
    update(index, { escalationChain: entry.escalationChain.filter((id) => id !== userId) })
  }

  async function handleSave() {
    try {
      const saved = await updatePolicy.mutateAsync(effective)
      setEntries(saved)
      showToast({ title: 'SLA policy updated', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not update SLA policy',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  if (!canManage) {
    return (
      <div className="space-y-2">
        <h3 className="font-medium">SLA policy</h3>
        {effective.length === 0 ? (
          <p className="text-sm text-muted-foreground">Using the system default SLA policy.</p>
        ) : (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {effective.map((e, i) => (
              <li key={i}>
                {e.priority}
                {e.customerTier ? ` / ${e.customerTier}` : ''}
                {e.channel ? ` / ${e.channel}` : ''}: {e.resolutionHours}h to resolve
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
          <h3 className="font-medium">SLA policy</h3>
          <p className="text-sm text-muted-foreground">
            Targets by priority, optionally narrowed to a customer tier and/or channel. Leaving
            "Any" applies the entry as a wildcard fallback. No entries uses the system default.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={add} className="gap-1">
          <Plus className="h-4 w-4" /> Add entry
        </Button>
      </div>

      <div className="space-y-4">
        {effective.map((entry, index) => (
          <div key={index} className="space-y-3 rounded-md border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={entry.priority}
                onValueChange={(v) => update(index, { priority: v as TicketPriority })}
              >
                <SelectTrigger aria-label={`Entry ${index + 1} priority`} className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={entry.customerTier ?? ANY_VALUE}
                onValueChange={(v) =>
                  update(index, { customerTier: v === ANY_VALUE ? null : (v as CustomerTier) })
                }
              >
                <SelectTrigger aria-label={`Entry ${index + 1} customer tier`} className="w-36">
                  <SelectValue placeholder="Any tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_VALUE}>Any tier</SelectItem>
                  {CUSTOMER_TIERS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                aria-label={`Entry ${index + 1} channel`}
                value={entry.channel ?? ''}
                onChange={(e) => update(index, { channel: e.target.value || null })}
                placeholder="Any channel"
                className="w-32"
              />

              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={`Remove entry ${index + 1}`}
                className="ml-auto text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">First response within</span>
                <Input
                  aria-label={`Entry ${index + 1} first response hours`}
                  type="number"
                  min={1}
                  className="w-20"
                  value={entry.firstResponseHours}
                  onChange={(e) => update(index, { firstResponseHours: Number(e.target.value) })}
                />
                <span className="text-sm text-muted-foreground">hours</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Resolve within</span>
                <Input
                  aria-label={`Entry ${index + 1} resolution hours`}
                  type="number"
                  min={1}
                  className="w-20"
                  value={entry.resolutionHours}
                  onChange={(e) => update(index, { resolutionHours: Number(e.target.value) })}
                />
                <span className="text-sm text-muted-foreground">hours</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Escalation chain (notified in order, 2h before a hard breach)
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {entry.escalationChain.map((userId) => (
                  <span
                    key={userId}
                    className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs"
                  >
                    {userId}
                    <button
                      type="button"
                      onClick={() => removeEscalation(index, userId)}
                      aria-label={`Remove escalation contact ${userId}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <UserSelect
                value={null}
                onChange={(v) => v && addEscalation(index, v)}
                allowUnassigned={false}
                placeholder="Add escalation contact…"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end border-t pt-4">
        <Button
          type="button"
          onClick={() => void handleSave()}
          loading={updatePolicy.isPending}
          disabled={!canSave}
        >
          Save SLA policy
        </Button>
      </div>
    </div>
  )
}
