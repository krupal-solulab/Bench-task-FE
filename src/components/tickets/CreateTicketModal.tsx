import { useState } from 'react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateTicket } from '@/hooks/mutations/useTicketMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import { TICKET_PRIORITIES } from '@/types/ticket.types'
import type { TicketPriority } from '@/types/ticket.types'

export interface CreateTicketModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (ticketId: string) => void
}

/** Staff-filed ticket creation - always via customerEmail+customerName (find-or-create), matching
 * the common "a customer emailed/called in" flow. Picking an existing Customer contact by id is
 * left for a later batch's contact-picker UI. */
export function CreateTicketModal({ open, onOpenChange, onCreated }: CreateTicketModalProps) {
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [priority, setPriority] = useState<TicketPriority>('Normal')
  const createTicket = useCreateTicket()
  const { showToast } = useToast()

  const canSave =
    subject.trim().length > 0 && customerEmail.trim().length > 0 && customerName.trim().length > 0

  function reset() {
    setSubject('')
    setDescription('')
    setCustomerEmail('')
    setCustomerName('')
    setPriority('Normal')
  }

  async function handleSave() {
    try {
      const ticket = await createTicket.mutateAsync({
        subject,
        description: description || undefined,
        customerEmail,
        customerName,
        priority,
      })
      showToast({ title: `Ticket ${ticket.ticketKey} created`, variant: 'success' })
      reset()
      onOpenChange(false)
      onCreated?.(ticket.id)
    } catch (err) {
      showToast({
        title: 'Could not create ticket',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="New ticket">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="ticket-subject" className="text-sm font-medium">
            Subject
          </label>
          <Input
            id="ticket-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Cannot reset my password"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ticket-description" className="text-sm font-medium">
            Description
          </label>
          <Textarea
            id="ticket-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="ticket-customer-email" className="text-sm font-medium">
              Customer email
            </label>
            <Input
              id="ticket-customer-email"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="dana@customer.com"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ticket-customer-name" className="text-sm font-medium">
              Customer name
            </label>
            <Input
              id="ticket-customer-name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Dana Customer"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Priority</label>
          <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
            <SelectTrigger aria-label="Priority">
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
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            loading={createTicket.isPending}
            disabled={!canSave}
          >
            Create ticket
          </Button>
        </div>
      </div>
    </Modal>
  )
}
