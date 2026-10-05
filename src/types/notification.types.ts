export const NOTIFICATION_TYPES = [
  'TaskAssigned',
  'StatusChanged',
  'CommentAdded',
  'DueSoon',
  'Automation',
  'Scheme',
  'Mentioned',
  'WatchedTaskUpdated',
  'ApprovalRequested',
  'ApprovalDecided',
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
  type?: NotificationType
}

/** Module 11 gap-closure - how often the digest of unread notifications goes out. */
export type DigestFrequency = 'off' | 'daily' | 'weekly'

export interface NotificationPreference {
  mutedTypes: NotificationType[]
  /** Optional on writes: omitting it leaves the stored digest unchanged. */
  digest?: DigestFrequency
}

/** Module 11 gap-closure - GET /notifications/digest. */
export interface NotificationDigest {
  period: 'daily' | 'weekly'
  unreadCount: number
  byType: Array<{ type: string; label: string; count: number }>
  highlights: Array<{ title: string; message: string; taskId: string | null; createdAt: string }>
  subject: string
  text: string
}

/** Module 11 gap-closure - an active per-issue notification snooze. */
export interface NotificationSnooze {
  id: string
  taskId: string
  until: string
}
