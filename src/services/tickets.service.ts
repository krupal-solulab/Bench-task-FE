import { apiGet, apiGetPaginated, apiPatch, apiPost } from './api-client'
import type {
  CreateTicketPayload,
  ListTicketsQuery,
  Ticket,
  TicketActivityEntry,
  TicketComment,
} from '@/types/ticket.types'

export const ticketsService = {
  list: (query: ListTicketsQuery) => apiGetPaginated<Ticket>('/tickets', query),

  get: (id: string) => apiGet<Ticket>(`/tickets/${id}`),

  create: (payload: CreateTicketPayload) => apiPost<Ticket>('/tickets', payload),

  updateStatus: (id: string, status: string) =>
    apiPatch<Ticket>(`/tickets/${id}/status`, { status }),

  assign: (id: string, assignee: string | null) =>
    apiPatch<Ticket>(`/tickets/${id}/assignee`, { assignee }),

  addComment: (id: string, body: string, isPublic: boolean) =>
    apiPost<TicketComment>(`/tickets/${id}/comments`, { body, isPublic }),

  listComments: (id: string) => apiGet<TicketComment[]>(`/tickets/${id}/comments`),

  listActivity: (id: string) => apiGet<TicketActivityEntry[]>(`/tickets/${id}/activity`),
}
