export const NOTIFICATION_TYPES = [
  'TaskAssigned',
  'StatusChanged',
  'CommentAdded',
  'DueSoon',
] as const
export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  taskId: string | null
  projectId: string | null
  read: boolean
  createdAt: string
}

export interface ListNotificationsQuery {
  page?: number
  limit?: number
  unreadOnly?: boolean
}

export interface NotificationPreference {
  mutedTypes: NotificationType[]
}
