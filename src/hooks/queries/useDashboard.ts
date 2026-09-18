import { useQuery } from '@tanstack/react-query'
import { QUERY_STALE_TIME, queryKeys } from '@/lib/constants'
import { dashboardService } from '@/services/dashboard.service'
import type { DashboardScopeQuery, WorkloadSortBy } from '@/types/dashboard.types'

export function useDashboardSummary(scope: DashboardScopeQuery) {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(scope),
    queryFn: () => dashboardService.summary(scope),
    staleTime: QUERY_STALE_TIME.dashboard,
  })
}

export function useProjectsByStatus(scope: DashboardScopeQuery) {
  return useQuery({
    queryKey: queryKeys.dashboard.projectsByStatus(scope),
    queryFn: () => dashboardService.projectsByStatus(scope),
    staleTime: QUERY_STALE_TIME.dashboard,
  })
}

export function useTasksStatus(scope: DashboardScopeQuery) {
  return useQuery({
    queryKey: queryKeys.dashboard.tasksStatus(scope),
    queryFn: () => dashboardService.tasksStatus(scope),
    staleTime: QUERY_STALE_TIME.dashboard,
  })
}

export function useTasksByPriority(scope: DashboardScopeQuery) {
  return useQuery({
    queryKey: queryKeys.dashboard.tasksByPriority(scope),
    queryFn: () => dashboardService.tasksByPriority(scope),
    staleTime: QUERY_STALE_TIME.dashboard,
  })
}

export function useDeveloperWorkload(scope: DashboardScopeQuery & { sortBy: WorkloadSortBy }) {
  return useQuery({
    queryKey: queryKeys.dashboard.developerWorkload(scope),
    queryFn: () => dashboardService.developerWorkload(scope),
    staleTime: QUERY_STALE_TIME.dashboard,
  })
}

export function useOverdueSummary(scope: DashboardScopeQuery) {
  return useQuery({
    queryKey: queryKeys.dashboard.overdueSummary(scope),
    queryFn: () => dashboardService.overdueSummary(scope),
    staleTime: QUERY_STALE_TIME.dashboard,
  })
}

export function useTaskTrend(scope: DashboardScopeQuery & { days: number }) {
  return useQuery({
    queryKey: queryKeys.dashboard.taskTrend(scope),
    queryFn: () => dashboardService.taskTrend(scope),
    staleTime: QUERY_STALE_TIME.dashboard,
  })
}

export function useSlaCompliance(scope: DashboardScopeQuery) {
  return useQuery({
    queryKey: queryKeys.dashboard.slaCompliance(scope),
    queryFn: () => dashboardService.slaCompliance(scope),
    staleTime: QUERY_STALE_TIME.dashboard,
  })
}

export function useVelocityTrend(scope: DashboardScopeQuery) {
  return useQuery({
    queryKey: queryKeys.dashboard.velocityTrend(scope),
    queryFn: () => dashboardService.velocityTrend(scope),
    staleTime: QUERY_STALE_TIME.dashboard,
  })
}

export function useActiveSprintsHealth(scope: DashboardScopeQuery) {
  return useQuery({
    queryKey: queryKeys.dashboard.activeSprintsHealth(scope),
    queryFn: () => dashboardService.activeSprintsHealth(scope),
    staleTime: QUERY_STALE_TIME.dashboard,
  })
}

export function useDashboardPreferences() {
  return useQuery({
    queryKey: queryKeys.dashboard.preferences,
    queryFn: () => dashboardService.getPreferences(),
    staleTime: QUERY_STALE_TIME.dashboard,
  })
}
