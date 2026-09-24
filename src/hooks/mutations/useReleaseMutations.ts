import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { releasesService } from '@/services/releases.service'
import type { CreateReleasePayload, UpdateReleasePayload } from '@/types/release.types'

/** A release's lifecycle/edits change per-project progress bars and a task's fixVersions/
 * affectsVersions chips - invalidating releases.all + this project's tasks covers both, mirroring
 * useSprintMutations' identical reasoning for sprint changes. */
function invalidateAfterReleaseChange(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string,
) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.releases.all })
  void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) })
  void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
}

export function useCreateRelease(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateReleasePayload) => releasesService.create(projectId, payload),
    onSuccess: () => invalidateAfterReleaseChange(queryClient, projectId),
  })
}

export function useUpdateRelease(projectId: string, releaseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateReleasePayload) =>
      releasesService.update(projectId, releaseId, payload),
    onSuccess: () => invalidateAfterReleaseChange(queryClient, projectId),
  })
}

export function useDeleteRelease(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (releaseId: string) => releasesService.remove(projectId, releaseId),
    onSuccess: () => invalidateAfterReleaseChange(queryClient, projectId),
  })
}

export function useReleaseAction(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      releaseId,
      action,
    }: {
      releaseId: string
      action: 'release' | 'unrelease' | 'archive'
    }) => releasesService[action](projectId, releaseId),
    onSuccess: () => invalidateAfterReleaseChange(queryClient, projectId),
  })
}
