import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { notificationsService } from '@/services/notifications.service'
import type { ListNotificationsQuery } from '@/types/notification.types'

export function useNotifications(query: ListNotificationsQuery = {}) {
  return useQuery({
    queryKey: queryKeys.notifications.list(query),
    queryFn: () => notificationsService.list(query),
  })
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: () => notificationsService.unreadCount(),
  })
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: queryKeys.notifications.preferences,
    queryFn: () => notificationsService.getPreferences(),
  })
}

/** Module 11 gap-closure - my active per-issue snoozes. */
export function useNotificationSnoozes() {
  return useQuery({
    queryKey: queryKeys.notifications.snoozes,
    queryFn: () => notificationsService.listSnoozes(),
  })
}

/** Module 11 gap-closure - the in-app digest for the last day or week. */
export function useNotificationDigest(period: 'daily' | 'weekly') {
  return useQuery({
    queryKey: queryKeys.notifications.digest(period),
    queryFn: () => notificationsService.digest(period),
  })
}
