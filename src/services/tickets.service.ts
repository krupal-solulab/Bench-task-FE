import { apiGet, apiGetPaginated, apiPatch, apiPost, apiPut } from './api-client'
import type {
  BusinessHoursCalendar,
  CreateTicketPayload,
  ListTicketsQuery,
  Ticket,
  TicketActivityEntry,
  TicketAutomationLogEntry,
  TicketAutomationRule,
  TicketComment,
  TicketMacro,
  TicketPriority,
  TicketScheduledAutomation,
  TicketSlaPolicyEntry,
} from '@/types/ticket.types'

export const ticketsService = {
  list: (query: ListTicketsQuery) => apiGetPaginated<Ticket>('/tickets', query),

  get: (id: string) => apiGet<Ticket>(`/tickets/${id}`),

  create: (payload: CreateTicketPayload) => apiPost<Ticket>('/tickets', payload),

  updateStatus: (id: string, status: string) =>
    apiPatch<Ticket>(`/tickets/${id}/status`, { status }),

  assign: (id: string, assignee: string | null) =>
    apiPatch<Ticket>(`/tickets/${id}/assignee`, { assignee }),

  updatePriority: (id: string, priority: TicketPriority) =>
    apiPatch<Ticket>(`/tickets/${id}/priority`, { priority }),

  addComment: (id: string, body: string, isPublic: boolean) =>
    apiPost<TicketComment>(`/tickets/${id}/comments`, { body, isPublic }),

  listComments: (id: string) => apiGet<TicketComment[]>(`/tickets/${id}/comments`),

  listActivity: (id: string) => apiGet<TicketActivityEntry[]>(`/tickets/${id}/activity`),

  applyMacro: (id: string, macroId: string) =>
    apiPost<Ticket>(`/tickets/${id}/apply-macro/${macroId}`),
}

/** Batch 1's Triggers/Automations/Macros + Advanced SLA/Business Hours settings - all scoped to
 * the caller's own org (no :id param, unlike project settings). */
export const ticketSettingsService = {
  getAutomationRules: () => apiGet<TicketAutomationRule[]>('/tickets/settings/automation-rules'),
  updateAutomationRules: (rules: Array<Partial<TicketAutomationRule>>) =>
    apiPut<TicketAutomationRule[]>('/tickets/settings/automation-rules', { rules }),

  getScheduledAutomations: () =>
    apiGet<TicketScheduledAutomation[]>('/tickets/settings/scheduled-automations'),
  updateScheduledAutomations: (automations: Array<Partial<TicketScheduledAutomation>>) =>
    apiPut<TicketScheduledAutomation[]>('/tickets/settings/scheduled-automations', {
      automations,
    }),

  getMacros: () => apiGet<TicketMacro[]>('/tickets/settings/macros'),
  updateMacros: (macros: Array<Partial<TicketMacro>>) =>
    apiPut<TicketMacro[]>('/tickets/settings/macros', { macros }),

  getSlaPolicy: () => apiGet<TicketSlaPolicyEntry[]>('/tickets/settings/sla-policy'),
  updateSlaPolicy: (policy: TicketSlaPolicyEntry[]) =>
    apiPut<TicketSlaPolicyEntry[]>('/tickets/settings/sla-policy', { policy }),

  getBusinessHoursCalendar: () =>
    apiGet<BusinessHoursCalendar | null>('/tickets/settings/business-hours'),
  updateBusinessHoursCalendar: (calendar: BusinessHoursCalendar) =>
    apiPut<BusinessHoursCalendar>('/tickets/settings/business-hours', calendar),

  automationLog: (query: { page: number; limit: number }) =>
    apiGetPaginated<TicketAutomationLogEntry>('/tickets/settings/automation-log', query),
}
