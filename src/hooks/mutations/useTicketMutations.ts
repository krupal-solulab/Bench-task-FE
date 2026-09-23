import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { ticketSettingsService, ticketsService } from '@/services/tickets.service'
import type {
  BusinessHoursCalendar,
  CreateTicketPayload,
  Ticket,
  TicketAutomationRule,
  TicketMacro,
  TicketPriority,
  TicketScheduledAutomation,
  TicketSlaPolicyEntry,
} from '@/types/ticket.types'

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

export function useUpdateTicketPriority(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (priority: TicketPriority) => ticketsService.updatePriority(id, priority),
    onSuccess: (ticket: Ticket) => {
      queryClient.setQueryData(queryKeys.tickets.detail(id), ticket)
      invalidateAfterTicketChange(queryClient, id)
      void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.activity(id) })
    },
  })
}

export function useApplyMacro(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (macroId: string) => ticketsService.applyMacro(id, macroId),
    onSuccess: (ticket: Ticket) => {
      queryClient.setQueryData(queryKeys.tickets.detail(id), ticket)
      invalidateAfterTicketChange(queryClient, id)
      void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.activity(id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.comments(id) })
    },
  })
}

// --- Batch 1: Triggers/Automations/Macros + Advanced SLA/Business Hours settings ---

export function useUpdateTicketAutomationRules() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (rules: Array<Partial<TicketAutomationRule>>) =>
      ticketSettingsService.updateAutomationRules(rules),
    onSuccess: (rules) => {
      queryClient.setQueryData(queryKeys.ticketSettings.automationRules, rules)
    },
  })
}

export function useUpdateTicketScheduledAutomations() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (automations: Array<Partial<TicketScheduledAutomation>>) =>
      ticketSettingsService.updateScheduledAutomations(automations),
    onSuccess: (automations) => {
      queryClient.setQueryData(queryKeys.ticketSettings.scheduledAutomations, automations)
    },
  })
}

export function useUpdateTicketMacros() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (macros: Array<Partial<TicketMacro>>) => ticketSettingsService.updateMacros(macros),
    onSuccess: (macros) => {
      queryClient.setQueryData(queryKeys.ticketSettings.macros, macros)
    },
  })
}

export function useUpdateTicketSlaPolicy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (policy: TicketSlaPolicyEntry[]) => ticketSettingsService.updateSlaPolicy(policy),
    onSuccess: (policy) => {
      queryClient.setQueryData(queryKeys.ticketSettings.slaPolicy, policy)
    },
  })
}

export function useUpdateBusinessHoursCalendar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (calendar: BusinessHoursCalendar) =>
      ticketSettingsService.updateBusinessHoursCalendar(calendar),
    onSuccess: (calendar) => {
      queryClient.setQueryData(queryKeys.ticketSettings.businessHoursCalendar, calendar)
    },
  })
}
