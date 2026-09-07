import type { ProjectStatus } from './project.types'
import type { TaskPriority, TaskStatus } from './task.types'

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
  status: TaskStatus
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
