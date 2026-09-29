import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { worklogsService } from '@/services/worklogs.service'
import type {
  MyTimesheetQuery,
  ProjectWorkLogListQuery,
  WorkLogListQuery,
  WorkLogReportQuery,
} from '@/types/worklog.types'

export function useTaskWorkLogs(taskId: string | undefined, query: WorkLogListQuery) {
  return useQuery({
    queryKey: queryKeys.worklogs.task(taskId ?? '', query),
    queryFn: () => worklogsService.listForTask(taskId!, query),
    enabled: !!taskId,
  })
}

/** Estimate-vs-actual for a single task (BRD: "estimate-vs-actual reporting"). */
export function useWorkLogSummary(taskId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.worklogs.summary(taskId ?? ''),
    queryFn: () => worklogsService.summaryForTask(taskId!),
    enabled: !!taskId,
  })
}

export function useProjectWorkLogs(projectId: string | undefined, query: ProjectWorkLogListQuery) {
  return useQuery({
    queryKey: queryKeys.worklogs.project(projectId ?? '', query),
    queryFn: () => worklogsService.listForProject(projectId!, query),
    enabled: !!projectId,
    placeholderData: (prev) => prev,
  })
}

/** The aggregated per-user timesheet report (BRD: "timesheets"). */
export function useWorkLogReport(projectId: string | undefined, query: WorkLogReportQuery) {
  return useQuery({
    queryKey: queryKeys.worklogs.report(projectId ?? '', query),
    queryFn: () => worklogsService.reportForProject(projectId!, query),
    enabled: !!projectId,
    placeholderData: (prev) => prev,
  })
}

/** Story-point-to-time correlation, for the scatter chart - not date-scoped (see the backend's own
 * doc comment on why). */
export function useWorkLogCorrelation(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.worklogs.correlation(projectId ?? ''),
    queryFn: () => worklogsService.correlationForProject(projectId!),
    enabled: !!projectId,
  })
}

/** Time-spent-vs-estimate for a single sprint - the "sprint" level of the BRD's issue/sprint/
 * project report trio. */
export function useSprintWorkLogReport(
  projectId: string | undefined,
  sprintId: string | undefined,
) {
  return useQuery({
    queryKey: queryKeys.worklogs.sprintReport(projectId ?? '', sprintId ?? ''),
    queryFn: () => worklogsService.reportForSprint(projectId!, sprintId!),
    enabled: !!projectId && !!sprintId,
  })
}

/** The caller's own work logs across every project, bucketed by week or month. */
export function useMyTimesheet(query: MyTimesheetQuery) {
  return useQuery({
    queryKey: queryKeys.worklogs.myTimesheet(query),
    queryFn: () => worklogsService.myTimesheet(query),
    placeholderData: (prev) => prev,
  })
}
