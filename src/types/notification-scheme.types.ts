import type { OrgRole } from './user.types'

export const NOTIFICATION_SCHEME_EVENTS = [
  'Assigned',
  'Commented',
  'Transitioned',
  'SprintStarted',
  'SprintCompleted',
  'SlaBreach',
] as const
export type NotificationSchemeEvent = (typeof NOTIFICATION_SCHEME_EVENTS)[number]

export const NOTIFICATION_SCHEME_EVENT_LABELS: Record<NotificationSchemeEvent, string> = {
  Assigned: 'Issue assigned',
  Commented: 'Comment added',
  Transitioned: 'Status changed',
  SprintStarted: 'Sprint started',
  SprintCompleted: 'Sprint completed',
  SlaBreach: 'SLA breached',
}

export const NOTIFICATION_CHANNELS = ['InApp', 'Email', 'WhatsApp'] as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]

export const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannel, string> = {
  InApp: 'In-app',
  Email: 'Email',
  WhatsApp: 'WhatsApp',
}

export interface NotificationSchemeRule {
  event: NotificationSchemeEvent
  notifyRoles: OrgRole[]
  channels: NotificationChannel[]
}
