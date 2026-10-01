import type { AuditLogEntry } from './audit-log.types'

/** Module 8 gap-closure - `GET /admin-console/stats`, the org Admin's system dashboard. */
export interface AdminSystemStats {
  generatedAt: string
  users: {
    total: number
    active: number
    inactive: number
    byRole: Record<string, { total: number; active: number }>
  }
  projects: {
    total: number
    archived: number
    byStatus: Record<string, number>
    createdLast30Days: number
  }
  tasks: {
    total: number
    open: number
    completed: number
    overdue: number
    createdLast7Days: number
    completedLast7Days: number
  }
  sprints: { active: number }
  activity: {
    auditEventsLast7Days: number
    recent: AuditLogEntry[]
  }
}
