import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Settings } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { useAuth } from '@/hooks/useAuth'
import { Pagination } from '@/components/common/Pagination'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { TableSkeleton } from '@/components/common/Skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CreateTicketModal } from '@/components/tickets/CreateTicketModal'
import { useTickets } from '@/hooks/queries/useTickets'
import { useQueryParams } from '@/hooks/useQueryParams'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import { toApiError } from '@/lib/error'
import { TICKET_PRIORITIES, TICKET_STATUSES } from '@/types/ticket.types'
import type { TicketPriority, TicketStatus } from '@/types/ticket.types'

const ALL = '__all__'

export function TicketsListPage() {
  const { hasRole } = useAuth()
  const [createOpen, setCreateOpen] = useState(false)
  const [state, setState] = useQueryParams({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    status: undefined as string | undefined,
    priority: undefined as string | undefined,
  })

  const { data, isLoading, isError, error, refetch } = useTickets({
    page: state.page,
    limit: state.limit,
    status: state.status ? [state.status as TicketStatus] : undefined,
    priority: state.priority ? [state.priority as TicketPriority] : undefined,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tickets"
        description="Customer support tickets"
        actions={
          <div className="flex gap-2">
            {(hasRole('Admin') || hasRole('Manager')) && (
              <Button type="button" variant="outline" asChild className="gap-1">
                <Link to="/tickets/settings">
                  <Settings className="h-4 w-4" /> Automation settings
                </Link>
              </Button>
            )}
            <Button type="button" onClick={() => setCreateOpen(true)} className="gap-1">
              <Plus className="h-4 w-4" /> New ticket
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Select
          value={state.status ?? ALL}
          onValueChange={(v) => setState({ status: v === ALL ? undefined : v, page: 1 })}
        >
          <SelectTrigger className="w-40" aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {TICKET_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={state.priority ?? ALL}
          onValueChange={(v) => setState({ priority: v === ALL ? undefined : v, page: 1 })}
        >
          <SelectTrigger className="w-40" aria-label="Filter by priority">
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All priorities</SelectItem>
            {TICKET_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <TableSkeleton rows={6} columns={5} />}
      {isError && <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />}
      {!isLoading && !isError && data?.data.length === 0 && (
        <EmptyState title="No tickets" description="Create a ticket to get started." />
      )}
      {!isLoading && !isError && data && data.data.length > 0 && (
        <div className="divide-y rounded-xl border bg-card">
          {data.data.map((ticket) => (
            <Link
              key={ticket.id}
              to={`/tickets/${ticket.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-accent/40"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  <span className="text-muted-foreground">{ticket.ticketKey}</span> {ticket.subject}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {ticket.customer.name} · {ticket.customer.email}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs">
                <span>{ticket.priority}</span>
                <span className="font-medium">{ticket.status}</span>
                <span className="text-muted-foreground">
                  {ticket.assignee?.name ?? 'Unassigned'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {data && (
        <Pagination
          page={data.meta.page}
          limit={data.meta.limit}
          total={data.meta.total}
          totalPages={data.meta.totalPages}
          onPageChange={(page) => setState({ page })}
          onLimitChange={(limit) => setState({ limit, page: 1 })}
        />
      )}

      <CreateTicketModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
