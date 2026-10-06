import type { ActivityFeedEntry } from '@/types/task.types'

/** Module 11 gap-closure - one plain-language line per activity-feed entry. */
export function describeActivity(entry: Pick<ActivityFeedEntry, 'action' | 'from' | 'to'>): string {
  const from = typeof entry.from === 'string' ? entry.from : null
  const to = typeof entry.to === 'string' ? entry.to : null
  switch (entry.action) {
    case 'created':
      return 'created'
    case 'status_changed':
      return from && to
        ? `moved from ${from} to ${to}`
        : `changed the status${to ? ` to ${to}` : ''}`
    case 'reassigned':
      return 'reassigned'
    case 'priority_changed':
      return from && to ? `changed priority ${from} → ${to}` : 'changed the priority'
    case 'due_date_changed':
      return 'changed the due date of'
    case 'updated':
      return 'updated'
    case 'approval_recorded':
      return 'added an approval on'
    case 'deleted':
      return 'deleted'
    case 'sprint_assigned':
      return 'moved into a sprint:'
    case 'sprint_removed':
      return 'moved back to the backlog:'
    case 'commented':
      return 'commented on'
    case 'approval_requested':
      return 'requested approval on'
    case 'approval_granted':
      return 'approved'
    case 'approval_rejected':
      return 'rejected the approval on'
    case 'moved_project':
      return 'moved to another project:'
    default:
      return entry.action.replace(/_/g, ' ')
  }
}
