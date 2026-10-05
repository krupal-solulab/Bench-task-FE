import { describe, expect, it } from 'vitest'
import { groupNotifications } from './notification-groups'
import type { Notification } from '@/types/notification.types'

const now = new Date(2026, 9, 5, 15, 0, 0) // Mon 5 Oct 2026, 15:00 local

function n(id: string, createdAt: Date, taskId: string | null, read = false): Notification {
  return {
    id,
    type: 'CommentAdded',
    title: `Notification ${id}`,
    message: '',
    taskId,
    projectId: null,
    read,
    createdAt: createdAt.toISOString(),
  }
}

describe('groupNotifications (Module 11 gap-closure)', () => {
  it('splits into day sections in order: Today, Yesterday, Earlier this week, Earlier', () => {
    const sections = groupNotifications(
      [
        n('a', new Date(2026, 9, 5, 9), 't1'),
        n('b', new Date(2026, 9, 4, 18), 't2'),
        n('c', new Date(2026, 9, 1, 12), 't3'),
        n('d', new Date(2026, 8, 20, 12), 't4'),
      ],
      now,
    )
    expect(sections.map((s) => s.label)).toEqual([
      'Today',
      'Yesterday',
      'Earlier this week',
      'Earlier',
    ])
  })

  it('bundles notifications about the same issue within a section, newest first', () => {
    const [today] = groupNotifications(
      [
        n('new', new Date(2026, 9, 5, 14), 't1', true),
        n('other', new Date(2026, 9, 5, 13), 't2', true),
        n('old', new Date(2026, 9, 5, 8), 't1', false),
      ],
      now,
    )
    expect(today!.bundles.map((b) => b.latest.id)).toEqual(['new', 'other'])
    expect(today!.bundles[0]!.older.map((o) => o.id)).toEqual(['old'])
    // An unread older notification keeps the bundle marked unread.
    expect(today!.bundles[0]!.unread).toBe(true)
    expect(today!.bundles[1]!.unread).toBe(false)
  })

  it('never bundles project-level notifications (no issue), nor across day sections', () => {
    const sections = groupNotifications(
      [
        n('p1', new Date(2026, 9, 5, 10), null),
        n('p2', new Date(2026, 9, 5, 9), null),
        n('t-today', new Date(2026, 9, 5, 8), 't1'),
        n('t-yesterday', new Date(2026, 9, 4, 8), 't1'),
      ],
      now,
    )
    expect(sections[0]!.bundles).toHaveLength(3)
    expect(sections[1]!.bundles[0]!.latest.id).toBe('t-yesterday')
  })
})
