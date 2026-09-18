import { apiGet } from './api-client'
import type { IntegrationHealthEntry } from '@/types/integration-health.types'

export const integrationHealthService = {
  check: () => apiGet<IntegrationHealthEntry[]>('/platform/integrations/health'),
}
