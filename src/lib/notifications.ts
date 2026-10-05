import type { NotificationType } from '@/types/notification.types'

/** Shared between NotificationBell's mute toggles, ProfilePage's notification preferences
 * section, and NotificationsPage's type filter (Module 11) - one label set, not three. */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  TaskAssigned: 'Assigned to me',
  StatusChanged: 'Status changed',
  CommentAdded: 'New comments',
  DueSoon: 'Due soon',
  Automation: 'Automation rules',
  Scheme: 'Notification schemes',
  Mentioned: 'Mentions',
  WatchedTaskUpdated: 'Watched issue activity',
  ApprovalRequested: 'Approval requests',
  ApprovalDecided: 'Approval decisions',
}
