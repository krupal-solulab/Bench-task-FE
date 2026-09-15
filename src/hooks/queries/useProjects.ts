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

export function useProjectWorkflow(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.workflow(id ?? ''),
    queryFn: () => projectsService.getWorkflow(id!),
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
