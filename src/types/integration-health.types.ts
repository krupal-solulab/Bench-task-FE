export type IntegrationHealthStatus = 'ok' | 'error' | 'stub'

export interface IntegrationHealthEntry {
  name: string
  status: IntegrationHealthStatus
  detail: string
}
