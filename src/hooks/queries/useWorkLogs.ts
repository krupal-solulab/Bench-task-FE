import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { worklogsService } from '@/services/worklogs.service'
import type {
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
