import { useQuery } from '@tanstack/react-query'
import { QUERY_STALE_TIME, queryKeys } from '@/lib/constants'
import { ticketSettingsService, ticketsService } from '@/services/tickets.service'
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

// --- Batch 1: Triggers/Automations/Macros + Advanced SLA/Business Hours settings ---

export function useTicketAutomationRules() {
  return useQuery({
    queryKey: queryKeys.ticketSettings.automationRules,
    queryFn: () => ticketSettingsService.getAutomationRules(),
  })
}

export function useTicketScheduledAutomations() {
  return useQuery({
    queryKey: queryKeys.ticketSettings.scheduledAutomations,
    queryFn: () => ticketSettingsService.getScheduledAutomations(),
  })
}

export function useTicketMacros() {
  return useQuery({
    queryKey: queryKeys.ticketSettings.macros,
    queryFn: () => ticketSettingsService.getMacros(),
  })
}

export function useTicketSlaPolicy() {
  return useQuery({
    queryKey: queryKeys.ticketSettings.slaPolicy,
    queryFn: () => ticketSettingsService.getSlaPolicy(),
  })
}

export function useBusinessHoursCalendar() {
  return useQuery({
    queryKey: queryKeys.ticketSettings.businessHoursCalendar,
    queryFn: () => ticketSettingsService.getBusinessHoursCalendar(),
  })
}

export function useTicketAutomationLog(page: number, limit: number) {
  return useQuery({
    queryKey: queryKeys.ticketSettings.automationLog(page),
    queryFn: () => ticketSettingsService.automationLog({ page, limit }),
    placeholderData: (prev) => prev,
  })
}
