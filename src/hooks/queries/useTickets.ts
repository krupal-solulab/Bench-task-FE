import { useQuery } from '@tanstack/react-query'
import { QUERY_STALE_TIME, queryKeys } from '@/lib/constants'
import { ticketsService } from '@/services/tickets.service'
import type { ListTicketsQuery } from '@/types/ticket.types'

export function useTickets(query: ListTicketsQuery) {
  return useQuery({
    queryKey: queryKeys.tickets.list(query),
    queryFn: () => ticketsService.list(query),
    staleTime: QUERY_STALE_TIME.list,
    placeholderData: (prev) => prev,
  })
}

export function useTicket(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tickets.detail(id ?? ''),
    queryFn: () => ticketsService.get(id!),
    enabled: !!id,
  })
}

export function useTicketComments(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tickets.comments(id ?? ''),
    queryFn: () => ticketsService.listComments(id!),
    enabled: !!id,
  })
}

export function useTicketActivity(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tickets.activity(id ?? ''),
    queryFn: () => ticketsService.listActivity(id!),
    enabled: !!id,
  })
}
