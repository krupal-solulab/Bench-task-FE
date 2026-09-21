import { apiGet, apiPut } from './api-client'
import type {
  ActiveSprintHealthEntry,
  DashboardPreference,
  DashboardScopeQuery,
  DashboardSummary,
  DeveloperWorkloadPoint,
  MyOpenIssueItem,
  OverdueSummaryItem,
  ProjectsByStatusPoint,
  ResolutionTimeTrendPoint,
  SlaComplianceEntry,
  TaskTrendPoint,
  TasksByPriorityPoint,
  TasksStatusPoint,
  VelocityTrendResult,
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

  slaCompliance: (query: DashboardScopeQuery) =>
    apiGet<SlaComplianceEntry[]>('/dashboard/sla-compliance', query),

  velocityTrend: (query: DashboardScopeQuery) =>
    apiGet<VelocityTrendResult>('/dashboard/velocity-trend', query),

  activeSprintsHealth: (query: DashboardScopeQuery) =>
    apiGet<ActiveSprintHealthEntry[]>('/dashboard/active-sprints-health', query),

  myOpenIssues: (query: DashboardScopeQuery) =>
    apiGet<MyOpenIssueItem[]>('/dashboard/my-open-issues', query),

  resolutionTimeTrend: (query: DashboardScopeQuery) =>
    apiGet<ResolutionTimeTrendPoint[]>('/dashboard/resolution-time-trend', query),

  getPreferences: () => apiGet<DashboardPreference>('/dashboard/preferences'),

  updatePreferences: (payload: DashboardPreference) =>
    apiPut<DashboardPreference>('/dashboard/preferences', payload),
}
