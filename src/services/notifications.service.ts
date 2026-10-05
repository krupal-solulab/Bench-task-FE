import { apiDelete, apiGetPaginated, apiPatch, apiPost, apiGet, apiPut } from './api-client'
import type {
  ListNotificationsQuery,
  Notification,
  NotificationPreference,
  NotificationSnooze,
  NotificationDigest,
} from '@/types/notification.types'

export const notificationsService = {
  list: (query: ListNotificationsQuery = {}) =>
    apiGetPaginated<Notification>('/notifications', query),

  unreadCount: () => apiGet<{ count: number }>('/notifications/unread-count'),

  markRead: (id: string) => apiPatch<void>(`/notifications/${id}/read`),

  markAllRead: () => apiPost<void>('/notifications/read-all'),

  getPreferences: () => apiGet<NotificationPreference>('/notifications/preferences'),

  updatePreferences: (payload: NotificationPreference) =>
    apiPut<NotificationPreference>('/notifications/preferences', payload),

  listSnoozes: () => apiGet<NotificationSnooze[]>('/notifications/snoozes'),

  digest: (period: 'daily' | 'weekly') =>
    apiGet<NotificationDigest>('/notifications/digest', { period }),

  snooze: (taskId: string, until: string) =>
    apiPut<NotificationSnooze>(`/notifications/snoozes/${taskId}`, { until }),

  unsnooze: (taskId: string) => apiDelete<void>(`/notifications/snoozes/${taskId}`),
}
