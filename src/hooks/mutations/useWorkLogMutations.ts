import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { worklogsService } from '@/services/worklogs.service'
import type { CreateWorkLogPayload, UpdateWorkLogPayload } from '@/types/worklog.types'

/** A single invalidation of the whole worklogs.all prefix covers the task list, the task
 * summary, and every project-wide list/report query - mirrors useSprintMutations/
 * useReleaseMutations' identical "invalidate the feature's whole prefix" reasoning. */
function invalidateAfterWorkLogChange(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.worklogs.all })
}

export function useLogWork(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateWorkLogPayload) => worklogsService.create(taskId, payload),
    onSuccess: () => invalidateAfterWorkLogChange(queryClient),
  })
}

export function useUpdateWorkLog(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateWorkLogPayload) => worklogsService.update(id, payload),
    onSuccess: () => invalidateAfterWorkLogChange(queryClient),
  })
}

export function useDeleteWorkLog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => worklogsService.remove(id),
    onSuccess: () => invalidateAfterWorkLogChange(queryClient),
  })
}
