import type { User } from './user.types'

export const TICKET_STATUSES = ['New', 'Open', 'Pending', 'Solved', 'Closed'] as const
export type TicketStatus = (typeof TICKET_STATUSES)[number]

export type TicketStatusCategory = 'Open' | 'Paused' | 'Terminal'

export const TICKET_PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'] as const
export type TicketPriority = (typeof TICKET_PRIORITIES)[number]

export const CUSTOMER_TIERS = ['Standard', 'Enterprise'] as const
export type CustomerTier = (typeof CUSTOMER_TIERS)[number]

export interface Customer {
  id: string
  email: string
  name: string
  tier: CustomerTier
  createdAt: string
  updatedAt: string
}

export interface TicketCustomerSummary {
  id: string
  name: string
  email: string
  tier: CustomerTier
}

export interface Ticket {
  id: string
  ticketKey: string
  subject: string
  description: string
  customer: TicketCustomerSummary
  assignee: User | null
  status: TicketStatus
  statusCategory: TicketStatusCategory
  priority: TicketPriority
  channel: string
  tags: string[]
  firstRespondedAt: string | null
  solvedAt: string | null
  pausedAccumMs: number
  createdAt: string
  updatedAt: string
}

export interface TicketComment {
  id: string
  ticket: string
  authorType: 'staff' | 'customer'
  authorUser: User | null
  authorCustomer: { id: string; name: string; email: string } | null
  body: string
  isPublic: boolean
  createdAt: string
}

export interface TicketActivityEntry {
  id: string
  actor: User
  action: string
  from: string | null
  to: string | null
  viaAutomationRule: string | null
  createdAt: string
}

export interface CreateTicketPayload {
  subject: string
  description?: string
  customerId?: string
  customerEmail?: string
  customerName?: string
  priority?: TicketPriority
  assignee?: string | null
  tags?: string[]
}

export interface CreateCustomerPayload {
  email: string
  name: string
  tier?: CustomerTier
}

export interface ListTicketsQuery {
  page: number
  limit: number
  status?: TicketStatus[]
  priority?: TicketPriority[]
  assignee?: string
  customer?: string
  search?: string
}
