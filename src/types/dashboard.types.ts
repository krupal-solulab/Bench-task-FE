import type { ProjectStatus } from './project.types'
import type { TaskPriority } from './task.types'
import type { StatusCategory } from './workflow.types'

export interface DashboardScopeQuery {
  projectId?: string
}

export interface DashboardSummary {
  totalProjects: number
  projectsByStatus: Record<ProjectStatus, number>
  totalTasks: number
  openTasks: number
  completedTasks: number
  overdueCount: number
  completionRate: number
}

export interface ProjectsByStatusPoint {
  status: ProjectStatus
  count: number
}

export interface TasksStatusPoint {
  status: string
  // A best-effort hint for coloring a status name the fixed CHART_COLORS.taskStatus map doesn't
  // recognize (a custom workflow's status) - see TaskStatusChart's fallback fill.
  category?: StatusCategory
  count: number
}

export interface TasksByPriorityPoint {
  priority: TaskPriority
  count: number
}

export type WorkloadSortBy = 'workload' | 'completionRate' | 'name'

export interface DeveloperWorkloadPoint {
  userId: string
  name: string
  totalAssigned: number
  completed: number
  completionRate: number
}

export interface TaskTrendPoint {
  date: string
  created: number
  completed: number
}

export interface OverdueSummaryItem {
  id: string
  title: string
  project: { id: string; name: string }
  assignee: { id: string; name: string } | null
  dueDate: string
  priority: TaskPriority
}

export interface SlaComplianceEntry {
  priority: TaskPriority
  total: number
  compliant: number
  breached: number
  avgResolutionHours: number | null
}

export interface VelocityTrendPoint {
  weekStart: string
  completedPoints: number
  completedCount: number
}

export interface VelocityTrendResult {
  points: VelocityTrendPoint[]
  hasStoryPoints: boolean
}

export interface ActiveSprintHealthEntry {
  sprintId: string
  sprintName: string
  projectId: string
  projectName: string
  percentTimeElapsed: number
  percentWorkRemaining: number
  remainingPoints: number
  remainingCount: number
  hasStoryPoints: boolean
}

export interface MyOpenIssueItem {
  id: string
  title: string
  issueKey: string
  project: { id: string; name: string }
  status: string
  dueDate: string | null
  priority: TaskPriority
}

export interface ResolutionTimeTrendPoint {
  weekStart: string
  avgResolutionHoursByPriority: Record<TaskPriority, number | null>
}

// The dashboard's customizable widgets - the top stat-card row is always shown and isn't part of
// this set. Order here doubles as the default order for anyone with no saved preference. The
// three Search/Dashboards v2 widgets are appended at the end, so a user with an existing saved
// order sees them added on (DashboardPage's "stored order ∩ available, then append new ids"
// logic), not inserted in the middle of their customized layout.
export const DASHBOARD_WIDGET_IDS = [
  'projectsByStatus',
  'tasksStatus',
  'tasksByPriority',
  'taskTrend',
  'developerWorkload',
  'overdueList',
  'slaCompliance',
  'velocityTrend',
  'activeSprintsHealth',
  'myOpenIssues',
  'resolutionTimeTrend',
] as const
export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number]

export interface DashboardPreference {
  hiddenWidgets: DashboardWidgetId[]
  widgetOrder: DashboardWidgetId[]
}
