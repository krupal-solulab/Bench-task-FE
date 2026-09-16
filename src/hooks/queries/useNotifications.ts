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
