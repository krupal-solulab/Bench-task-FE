import { apiGet } from './api-client'
import type {
  DashboardScopeQuery,
  DashboardSummary,
  DeveloperWorkloadPoint,
  OverdueSummaryItem,
  ProjectsByStatusPoint,
  TaskTrendPoint,
  TasksByPriorityPoint,
  TasksStatusPoint,
  WorkloadSortBy,
} from '@/types/dashboard.types'

export const dashboardService = {
  summary: (query: DashboardScopeQuery) => apiGet<DashboardSummary>('/dashboard/summary', query),

  projectsByStatus: (query: DashboardScopeQuery) =>
    apiGet<ProjectsByStatusPoint[]>('/dashboard/projects-by-status', query),

  tasksStatus: (query: DashboardScopeQuery) =>
    apiGet<TasksStatusPoint[]>('/dashboard/tasks-status', query),

  tasksByPriority: (query: DashboardScopeQuery) =>
    apiGet<TasksByPriorityPoint[]>('/dashboard/tasks-by-priority', query),

  developerWorkload: (query: DashboardScopeQuery & { sortBy?: WorkloadSortBy }) =>
    apiGet<DeveloperWorkloadPoint[]>('/dashboard/developer-workload', query),

  overdueSummary: (query: DashboardScopeQuery) =>
    apiGet<OverdueSummaryItem[]>('/dashboard/overdue-summary', query),

  taskTrend: (query: DashboardScopeQuery & { days?: number }) =>
    apiGet<TaskTrendPoint[]>('/dashboard/task-trend', query),
}
