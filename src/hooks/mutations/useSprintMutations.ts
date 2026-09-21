import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { sprintsService } from '@/services/sprints.service'
import type {
  CompleteSprintPayload,
  CreateSprintPayload,
  UpdateSprintPayload,
} from '@/types/sprint.types'

/**
 * Starting/completing a sprint reshuffles which tasks appear in the Backlog vs. Sprint Board and
 * changes task counts - invalidating projects.detail(projectId) covers projects.tasks/stats/etc
 * too, since TanStack Query matches invalidation by key prefix (see useTaskMutations.ts for the
 * same reasoning applied to a single task change).
 */
function invalidateAfterSprintChange(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string,
) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.sprints.all })
  void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) })
}

export function useCreateSprint(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateSprintPayload) => sprintsService.create(projectId, payload),
    onSuccess: () => invalidateAfterSprintChange(queryClient, projectId),
  })
}

export function useUpdateSprint(projectId: string, sprintId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateSprintPayload) =>
      sprintsService.update(projectId, sprintId, payload),
    onSuccess: () => invalidateAfterSprintChange(queryClient, projectId),
  })
}

export function useStartSprint(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sprintId: string) => sprintsService.start(projectId, sprintId),
    onSuccess: () => invalidateAfterSprintChange(queryClient, projectId),
  })
}

export function useCompleteSprint(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sprintId, ...payload }: { sprintId: string } & CompleteSprintPayload) =>
      sprintsService.complete(projectId, sprintId, payload),
    onSuccess: () => invalidateAfterSprintChange(queryClient, projectId),
  })
}

export function useDeleteSprint(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sprintId: string) => sprintsService.remove(projectId, sprintId),
    onSuccess: () => invalidateAfterSprintChange(queryClient, projectId),
  })
}
