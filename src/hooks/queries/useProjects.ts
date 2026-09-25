import { useQuery } from '@tanstack/react-query'
import { QUERY_STALE_TIME, queryKeys } from '@/lib/constants'
import { projectsService } from '@/services/projects.service'
import type { ProjectListQuery } from '@/types/project.types'
import type { PageQuery } from '@/types/api.types'
import type { TaskListQuery } from '@/types/task.types'

export function useProjects(query: ProjectListQuery) {
  return useQuery({
    queryKey: queryKeys.projects.list(query),
    queryFn: () => projectsService.list(query),
    staleTime: QUERY_STALE_TIME.list,
    placeholderData: (prev) => prev,
  })
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.detail(id ?? ''),
    queryFn: () => projectsService.get(id!),
    enabled: !!id,
  })
}

export function useProjectMembers(id: string | undefined, query: PageQuery = {}) {
  return useQuery({
    queryKey: queryKeys.projects.members(id ?? ''),
    queryFn: () => projectsService.members(id!, query),
    enabled: !!id,
  })
}

export function useProjectTasks(
  id: string | undefined,
  query: TaskListQuery,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.projects.tasks(id ?? '', query),
    queryFn: () => projectsService.tasks(id!, query),
    enabled: !!id && (options.enabled ?? true),
    staleTime: QUERY_STALE_TIME.list,
    placeholderData: (prev) => prev,
  })
}

export function useProjectStats(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.stats(id ?? ''),
    queryFn: () => projectsService.stats(id!),
    enabled: !!id,
  })
}

export function useProjectActivity(id: string | undefined, page: number, limit: number) {
  return useQuery({
    queryKey: queryKeys.projects.activity(id ?? ''),
    queryFn: () => projectsService.activity(id!, { page, limit }),
    enabled: !!id,
  })
}

export function useAutomationLog(id: string | undefined, page: number, limit: number) {
  return useQuery({
    queryKey: queryKeys.projects.automationLog(id ?? '', page),
    queryFn: () => projectsService.automationLog(id!, { page, limit }),
    enabled: !!id,
    placeholderData: (prev) => prev,
  })
}

export function useProjectWorkflow(id: string | undefined, issueType?: string) {
  return useQuery({
    queryKey: queryKeys.projects.workflow(id ?? '', issueType),
    queryFn: () => projectsService.getWorkflow(id!, issueType),
    enabled: !!id,
  })
}

export function useProjectLabels(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.labels(id ?? ''),
    queryFn: () => projectsService.listLabels(id!),
    enabled: !!id,
  })
}

/** The project's effective custom fields, with any per-issue-type hidden/required override
 * applied when `issueType` is given (Custom Fields v2). Omitting `issueType` returns the same
 * project-wide list as `project.customFields`. */
export function useEffectiveCustomFields(id: string | undefined, issueType?: string) {
  return useQuery({
    queryKey: queryKeys.projects.effectiveCustomFields(id ?? '', issueType),
    queryFn: () => projectsService.getEffectiveCustomFields(id!, issueType),
    enabled: !!id,
  })
}

export function useCustomFieldOverride(id: string | undefined, issueType: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.customFieldOverride(id ?? '', issueType ?? ''),
    queryFn: () => projectsService.getCustomFieldOverride(id!, issueType!),
    enabled: !!id && !!issueType,
  })
}

export function useSlaPolicy(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.slaPolicy(id ?? ''),
    queryFn: () => projectsService.getSlaPolicy(id!),
    enabled: !!id,
  })
}

export function useEpicProgressReport(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.epicProgressReport(id ?? ''),
    queryFn: () => projectsService.epicProgressReport(id!),
    enabled: !!id,
  })
}

export function useCfdReport(id: string | undefined, days = 30) {
  return useQuery({
    queryKey: queryKeys.projects.cfd(id ?? '', days),
    queryFn: () => projectsService.cfdReport(id!, days),
    enabled: !!id,
  })
}

export function useCycleTimeReport(id: string | undefined, days = 90) {
  return useQuery({
    queryKey: queryKeys.projects.cycleTime(id ?? '', days),
    queryFn: () => projectsService.cycleTimeReport(id!, days),
    enabled: !!id,
  })
}

/** Module 10's deterministic (non-LLM) field suggester for new-issue creation. */
export function useSuggestedTaskFields(id: string | undefined, issueType: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.suggestedTaskFields(id ?? '', issueType),
    queryFn: () => projectsService.suggestedTaskFields(id!, issueType),
    enabled: !!id,
  })
}
