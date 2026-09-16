import { apiGetPaginated, apiPatch, apiPost, apiGet, apiPut } from './api-client'
import type {
  ListNotificationsQuery,
  Notification,
  NotificationPreference,
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
}
