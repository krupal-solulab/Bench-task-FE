import { useQuery } from '@tanstack/react-query'
import { QUERY_STALE_TIME, queryKeys } from '@/lib/constants'
import { sprintsService } from '@/services/sprints.service'
import type { SprintListQuery } from '@/types/sprint.types'

export function useSprints(projectId: string | undefined, query: SprintListQuery) {
  return useQuery({
    queryKey: queryKeys.sprints.list(projectId ?? '', query),
    queryFn: () => sprintsService.list(projectId!, query),
    enabled: !!projectId,
    staleTime: QUERY_STALE_TIME.list,
    placeholderData: (prev) => prev,
  })
}

export function useSprint(projectId: string | undefined, sprintId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.sprints.detail(sprintId ?? ''),
    queryFn: () => sprintsService.get(projectId!, sprintId!),
    enabled: !!projectId && !!sprintId,
  })
}

export function useActiveSprint(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.sprints.active(projectId ?? ''),
    queryFn: () => sprintsService.getActive(projectId!),
    enabled: !!projectId,
  })
}

export function useSprintActivity(
  projectId: string | undefined,
  sprintId: string | undefined,
  page: number,
  limit: number,
) {
  return useQuery({
    queryKey: queryKeys.sprints.activity(sprintId ?? ''),
    queryFn: () => sprintsService.activity(projectId!, sprintId!, { page, limit }),
    enabled: !!projectId && !!sprintId,
  })
}

export function useSprintVelocity(projectId: string | undefined, limit?: number) {
  return useQuery({
    queryKey: queryKeys.sprints.velocity(projectId ?? '', limit),
    queryFn: () => sprintsService.velocity(projectId!, limit),
    enabled: !!projectId,
  })
}

export function useSprintBurndown(projectId: string | undefined, sprintId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.sprints.burndown(sprintId ?? ''),
    queryFn: () => sprintsService.burndown(projectId!, sprintId!),
    enabled: !!projectId && !!sprintId,
  })
}
