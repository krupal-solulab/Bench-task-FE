import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
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
import { Skeleton } from '@/components/common/Skeleton'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import {
  useTicket,
  useTicketActivity,
  useTicketComments,
  useTicketMacros,
} from '@/hooks/queries/useTickets'
import {
  useAddTicketComment,
  useApplyMacro,
  useAssignTicket,
  useUpdateTicketPriority,
  useUpdateTicketStatus,
} from '@/hooks/mutations/useTicketMutations'
import { useToast } from '@/hooks/useToast'
import { formatDateTime } from '@/lib/date'
import { toApiError } from '@/lib/error'
import { TICKET_PRIORITIES, TICKET_STATUSES } from '@/types/ticket.types'
import type { TicketPriority, TicketStatus } from '@/types/ticket.types'

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: ticket, isLoading, isError, error, refetch } = useTicket(id)
  const { data: comments } = useTicketComments(id)
  const { data: activity } = useTicketActivity(id)
  const { data: macros } = useTicketMacros()
  const updateStatus = useUpdateTicketStatus(id ?? '')
  const assignTicket = useAssignTicket(id ?? '')
  const updatePriority = useUpdateTicketPriority(id ?? '')
  const applyMacro = useApplyMacro(id ?? '')
  const addComment = useAddTicketComment(id ?? '')
  const { showToast } = useToast()

  const [commentBody, setCommentBody] = useState('')
  const [isPublicReply, setIsPublicReply] = useState(true)

  async function handleStatusChange(status: string) {
    try {
      await updateStatus.mutateAsync(status)
    } catch (err) {
      showToast({
        title: 'Could not change status',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleAssigneeChange(userId: string | null) {
    try {
      await assignTicket.mutateAsync(userId)
    } catch (err) {
      showToast({
        title: 'Could not change assignee',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handlePriorityChange(priority: string) {
    try {
      await updatePriority.mutateAsync(priority as TicketPriority)
    } catch (err) {
      showToast({
        title: 'Could not change priority',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleApplyMacro(macroId: string) {
    try {
      await applyMacro.mutateAsync(macroId)
      showToast({ title: 'Macro applied', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not apply macro',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleAddComment() {
    if (!commentBody.trim()) return
    try {
      await addComment.mutateAsync({ body: commentBody, isPublic: isPublicReply })
      setCommentBody('')
      setIsPublicReply(true)
    } catch (err) {
      showToast({
        title: 'Could not add comment',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }
  if (isError || !ticket) {
    return <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${ticket.ticketKey} · ${ticket.subject}`}
        description={`${ticket.customer.name} (${ticket.customer.email})`}
        actions={
          !!macros?.length && (
            <Select onValueChange={(v) => void handleApplyMacro(v)}>
              <SelectTrigger aria-label="Apply macro" className="w-48">
                <SelectValue placeholder="Apply macro…" />
              </SelectTrigger>
              <SelectContent>
                {macros.map((macro) => (
                  <SelectItem key={macro.id} value={macro.id}>
                    {macro.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase text-muted-foreground">Status</label>
          <Select value={ticket.status} onValueChange={(v) => void handleStatusChange(v)}>
            <SelectTrigger aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TICKET_STATUSES.map((s: TicketStatus) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase text-muted-foreground">Priority</label>
          <Select value={ticket.priority} onValueChange={(v) => void handlePriorityChange(v)}>
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

        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase text-muted-foreground">Assignee</label>
          <UserSelect
            value={ticket.assignee?.id ?? null}
            onChange={(v) => void handleAssigneeChange(v)}
            placeholder="Unassigned"
          />
        </div>
      </div>

      {ticket.description && (
        <div className="rounded-lg border bg-card p-4 text-sm">{ticket.description}</div>
      )}

      <div className="space-y-3">
        <h3 className="font-medium">Conversation</h3>
        {!comments || comments.length === 0 ? (
          <EmptyState title="No replies yet" description="Add the first reply below." />
        ) : (
          <ul className="space-y-2">
            {comments.map((comment) => (
              <li
                key={comment.id}
                className={`rounded-lg border p-3 text-sm ${
                  comment.isPublic ? 'bg-card' : 'bg-muted/50'
                }`}
              >
                <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {comment.authorType === 'staff'
                      ? (comment.authorUser?.name ?? 'Staff')
                      : (comment.authorCustomer?.name ?? 'Customer')}
                  </span>
                  {!comment.isPublic && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700">
                      Internal note
                    </span>
                  )}
                  <span>{formatDateTime(comment.createdAt)}</span>
                </div>
                <p className="whitespace-pre-wrap">{comment.body}</p>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2 rounded-lg border p-3">
          <Textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder="Write a reply or internal note…"
            rows={3}
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-sm">
              <Checkbox
                aria-label="Public reply"
                checked={isPublicReply}
                onCheckedChange={(checked) => setIsPublicReply(checked === true)}
              />
              Public reply (uncheck for an internal note)
            </label>
            <Button
              type="button"
              onClick={() => void handleAddComment()}
              loading={addComment.isPending}
              disabled={!commentBody.trim()}
            >
              {isPublicReply ? 'Send reply' : 'Add note'}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium">Activity</h3>
        {activity && activity.length > 0 ? (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {activity.map((entry) => (
              <li key={entry.id}>
                {formatDateTime(entry.createdAt)} — {entry.actor.name} {entry.action}
                {entry.from && entry.to ? ` (${entry.from} → ${entry.to})` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        )}
      </div>
    </div>
  )
}
