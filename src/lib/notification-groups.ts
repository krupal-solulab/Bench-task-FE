import type { Notification } from '@/types/notification.types'

export type NotificationDayGroup = 'Today' | 'Yesterday' | 'Earlier this week' | 'Earlier'

export interface NotificationBundle {
  /** Stable key: the issue id when bundled by issue, otherwise the notification's own id. */
  key: string
  /** The newest notification - what the bundle shows by default. */
  latest: Notification
  /** Older notifications about the same issue in the same day group (newest first). */
  older: Notification[]
  unread: boolean
}

export interface NotificationSection {
  label: NotificationDayGroup
  bundles: NotificationBundle[]
}

const DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function dayGroupFor(createdAt: string, now: Date): NotificationDayGroup {
  const age = startOfDay(now) - startOfDay(new Date(createdAt))
  if (age <= 0) return 'Today'
  if (age <= DAY_MS) return 'Yesterday'
  if (age < 7 * DAY_MS) return 'Earlier this week'
  return 'Earlier'
}

/**
 * Module 11 gap-closure: visual grouping for the notifications list - day sections, and within a
 * section, every notification about the same issue bundled under its newest one. Input must be
 * newest-first (the API's order); order is preserved. Pure display logic, no API change.
 */
export function groupNotifications(
  notifications: Notification[],
  now = new Date(),
): NotificationSection[] {
  const sections: NotificationSection[] = []
  for (const notification of notifications) {
    const label = dayGroupFor(notification.createdAt, now)
    let section = sections.find((s) => s.label === label)
    if (!section) {
      section = { label, bundles: [] }
      sections.push(section)
    }
    const existing = notification.taskId
      ? section.bundles.find((b) => b.key === `task-${notification.taskId}`)
      : undefined
    if (existing) {
      existing.older.push(notification)
      existing.unread = existing.unread || !notification.read
    } else {
      section.bundles.push({
        key: notification.taskId ? `task-${notification.taskId}` : notification.id,
        latest: notification,
        older: [],
        unread: !notification.read,
      })
    }
  }
  return sections
}
