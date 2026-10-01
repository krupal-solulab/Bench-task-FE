import { apiGet } from './api-client'
import type { AdminSystemStats } from '@/types/admin-console.types'

export const adminConsoleService = {
  stats: () => apiGet<AdminSystemStats>('/admin-console/stats'),
}
