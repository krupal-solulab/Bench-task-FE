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

// --- Triggers/Automations/Macros + Advanced SLA/Business Hours (Batch 1) ---

export const TICKET_AUTOMATION_TRIGGER_TYPES = [
  'TicketCreated',
  'TicketStatusChanged',
  'TicketCommentAdded',
  'TicketReassigned',
] as const
export type TicketAutomationTriggerType = (typeof TICKET_AUTOMATION_TRIGGER_TYPES)[number]

export const TICKET_AUTOMATION_ACTION_TYPES = [
  'SetStatus',
  'SetPriority',
  'SetAssignee',
  'AddTags',
  'AddComment',
  'NotifyRole',
  'Webhook',
] as const
export type TicketAutomationActionType = (typeof TICKET_AUTOMATION_ACTION_TYPES)[number]

export const TICKET_AUTOMATION_CONDITION_FIELDS = [
  'Priority',
  'Channel',
  'CustomerTier',
  'Tag',
] as const
export type TicketAutomationConditionField = (typeof TICKET_AUTOMATION_CONDITION_FIELDS)[number]

export interface TicketAutomationCondition {
  field: TicketAutomationConditionField
  value: string
}

export interface TicketAutomationAction {
  type: TicketAutomationActionType
  value: string
}

export interface TicketAutomationTrigger {
  type: TicketAutomationTriggerType
  toStatus?: string | null
  fromStatus?: string | null
}

export interface TicketAutomationRule {
  id: string
  name: string
  enabled: boolean
  trigger: TicketAutomationTrigger
  conditions: TicketAutomationCondition[]
  actions: TicketAutomationAction[]
}

export interface TicketScheduledAutomation {
  id: string
  name: string
  enabled: boolean
  matchStatus: TicketStatus
  afterHours: number
  conditions: TicketAutomationCondition[]
  actions: TicketAutomationAction[]
}

export const TICKET_MACRO_VISIBILITIES = ['team', 'personal'] as const
export type TicketMacroVisibility = (typeof TICKET_MACRO_VISIBILITIES)[number]

export interface TicketMacro {
  id: string
  name: string
  actions: TicketAutomationAction[]
  visibility: TicketMacroVisibility
  createdBy: string
}

export interface TicketSlaPolicyEntry {
  priority: TicketPriority
  customerTier: CustomerTier | null
  channel: string | null
  firstResponseHours: number
  resolutionHours: number
  escalationChain: string[]
}

export interface BusinessHoursWindow {
  start: string
  end: string
}

export interface BusinessHoursCalendar {
  workingDays: number[]
  workingHours: BusinessHoursWindow
  holidays: string[]
}

export interface TicketAutomationLogEntry {
  id: string
  ticket: { id: string; subject: string; ticketKey: string } | null
  ruleId: string
  ruleName: string
  triggerType: string
  actionSummaries: string[]
  outcome: 'success' | 'failure'
  errorMessage: string | null
  createdAt: string
}
