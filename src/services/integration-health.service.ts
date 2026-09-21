import { apiGet, apiPost } from './api-client'
import type {
  IntegrationHealthEntry,
  PausableNotificationChannel,
} from '@/types/integration-health.types'

export const integrationHealthService = {
  check: () => apiGet<IntegrationHealthEntry[]>('/platform/integrations/health'),

  pause: (channel: PausableNotificationChannel) =>
    apiPost<IntegrationHealthEntry[]>(`/platform/integrations/${channel}/pause`),

  resume: (channel: PausableNotificationChannel) =>
    apiPost<IntegrationHealthEntry[]>(`/platform/integrations/${channel}/resume`),
}
