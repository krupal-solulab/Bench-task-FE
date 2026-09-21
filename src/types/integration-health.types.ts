export type IntegrationHealthStatus = 'ok' | 'error' | 'stub'

export interface IntegrationHealthEntry {
  name: string
  status: IntegrationHealthStatus
  detail: string
  // Only set for Email/WhatsApp (BRD 8's Platform Admin pause/resume) - undefined for every other
  // row, which stays purely display-only.
  paused?: boolean
}

export const PAUSABLE_NOTIFICATION_CHANNELS = ['Email', 'WhatsApp'] as const
export type PausableNotificationChannel = (typeof PAUSABLE_NOTIFICATION_CHANNELS)[number]
