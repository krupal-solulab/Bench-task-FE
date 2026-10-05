import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { notificationsService } from '@/services/notifications.service'
import type { NotificationPreference } from '@/types/notification.types'

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsService.markRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    },
  })
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: NotificationPreference) =>
      notificationsService.updatePreferences(payload),
    onSuccess: (preference) => {
      queryClient.setQueryData(queryKeys.notifications.preferences, preference)
    },
  })
}

/** Module 11 gap-closure - snoozing refreshes the list, unread count and snooze list together
 * (they all live under notifications.all). */
export function useSnoozeTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, until }: { taskId: string; until: string }) =>
      notificationsService.snooze(taskId, until),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  })
}

export function useUnsnoozeTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (taskId: string) => notificationsService.unsnooze(taskId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  })
}
