import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { ticketsService } from '@/services/tickets.service'
import type { CreateTicketPayload, Ticket } from '@/types/ticket.types'

function invalidateAfterTicketChange(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all })
  if (id) void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.detail(id) })
}

export function useCreateTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateTicketPayload) => ticketsService.create(payload),
    onSuccess: () => invalidateAfterTicketChange(queryClient),
  })
}

export function useUpdateTicketStatus(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (status: string) => ticketsService.updateStatus(id, status),
    onSuccess: (ticket: Ticket) => {
      queryClient.setQueryData(queryKeys.tickets.detail(id), ticket)
      invalidateAfterTicketChange(queryClient, id)
      void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.activity(id) })
    },
  })
}

export function useAssignTicket(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (assignee: string | null) => ticketsService.assign(id, assignee),
    onSuccess: (ticket: Ticket) => {
      queryClient.setQueryData(queryKeys.tickets.detail(id), ticket)
      invalidateAfterTicketChange(queryClient, id)
      void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.activity(id) })
    },
  })
}

export function useAddTicketComment(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ body, isPublic }: { body: string; isPublic: boolean }) =>
      ticketsService.addComment(id, body, isPublic),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.comments(id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.activity(id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.detail(id) })
    },
  })
}
