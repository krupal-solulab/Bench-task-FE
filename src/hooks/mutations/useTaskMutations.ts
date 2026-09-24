import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { tasksService } from '@/services/tasks.service'
import type {
  BulkAssignPayload,
  BulkDeletePayload,
  BulkMoveSprintPayload,
  BulkPriorityPayload,
  BulkRelabelPayload,
  BulkStatusPayload,
  CreateTaskPayload,
  Task,
  UpdateTaskAssigneePayload,
  UpdateTaskPayload,
  UpdateTaskRankPayload,
  UpdateTaskSprintPayload,
} from '@/types/task.types'

function invalidateAfterTaskChange(queryClient: ReturnType<typeof useQueryClient>, task?: Task) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
  if (task) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(task.project.id) })
  }
}

/** Moving a task in/out of a sprint changes both the Backlog and Sprint Board views at once. */
function invalidateAfterSprintMove(queryClient: ReturnType<typeof useQueryClient>, task?: Task) {
  invalidateAfterTaskChange(queryClient, task)
  void queryClient.invalidateQueries({ queryKey: queryKeys.sprints.all })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => tasksService.create(payload),
    onSuccess: (task) => invalidateAfterTaskChange(queryClient, task),
  })
}

export function useUpdateTask(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateTaskPayload) => tasksService.update(id, payload),
    onSuccess: (task) => {
      queryClient.setQueryData(queryKeys.tasks.detail(id), task)
      invalidateAfterTaskChange(queryClient, task)
    },
  })
}

export function useUpdateTaskStatus(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (status: string) => tasksService.updateStatus(id, { status }),
    onMutate: async (status) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(id) })
      const previous = queryClient.getQueryData<Task>(queryKeys.tasks.detail(id))
      if (previous) {
        queryClient.setQueryData<Task>(queryKeys.tasks.detail(id), { ...previous, status })
      }
      return { previous }
    },
    onError: (_err, _status, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.tasks.detail(id), context.previous)
      }
    },
    onSuccess: (task) => {
      queryClient.setQueryData(queryKeys.tasks.detail(id), task)
      invalidateAfterTaskChange(queryClient, task)
    },
  })
}

/**
 * Same shape as useUpdateTaskStatus, but takes the task id per-call instead of fixed at hook
 * creation time - needed by the Kanban board's drag handler, which can't call a hook
 * conditionally once per card. useUpdateTaskStatus/TaskStatusControl are untouched.
 */
export function useUpdateAnyTaskStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      tasksService.updateStatus(id, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(id) })
      const previous = queryClient.getQueryData<Task>(queryKeys.tasks.detail(id))
      if (previous) {
        queryClient.setQueryData<Task>(queryKeys.tasks.detail(id), { ...previous, status })
      }
      return { previous, id }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.tasks.detail(context.id), context.previous)
      }
    },
    onSuccess: (task) => {
      queryClient.setQueryData(queryKeys.tasks.detail(task.id), task)
      invalidateAfterTaskChange(queryClient, task)
    },
  })
}

export function useUpdateTaskSprint(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateTaskSprintPayload) => tasksService.updateSprint(id, payload),
    onSuccess: (task) => {
      queryClient.setQueryData(queryKeys.tasks.detail(id), task)
      invalidateAfterSprintMove(queryClient, task)
    },
  })
}

/**
 * Same "id passed per-call" shape as useUpdateAnyTaskStatus, needed because the backlog's drag
 * handler can't call a hook conditionally once per row. Uses the same onMutate optimistic-update
 * pattern for instant drag feedback.
 */
export function useUpdateAnyTaskRank() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & UpdateTaskRankPayload) =>
      tasksService.updateRank(id, payload),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(id) })
      const previous = queryClient.getQueryData<Task>(queryKeys.tasks.detail(id))
      return { previous, id }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.tasks.detail(context.id), context.previous)
      }
    },
    onSuccess: (task) => {
      queryClient.setQueryData(queryKeys.tasks.detail(task.id), task)
      invalidateAfterTaskChange(queryClient, task)
    },
  })
}

export function useUpdateTaskAssignee(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateTaskAssigneePayload) => tasksService.updateAssignee(id, payload),
    onSuccess: (task) => {
      queryClient.setQueryData(queryKeys.tasks.detail(id), task)
      invalidateAfterTaskChange(queryClient, task)
    },
  })
}

/** BRD 6.2's bulk backlog actions - each invalidates the same broad set a single-task change
 * would, since a bulk call can touch tasks across multiple projects/sprints at once. */
export function useBulkMoveSprint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: BulkMoveSprintPayload) => tasksService.bulkMoveSprint(payload),
    onSuccess: () => invalidateAfterSprintMove(queryClient),
  })
}

export function useBulkAssign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: BulkAssignPayload) => tasksService.bulkAssign(payload),
    onSuccess: () => invalidateAfterTaskChange(queryClient),
  })
}

export function useBulkRelabel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: BulkRelabelPayload) => tasksService.bulkRelabel(payload),
    onSuccess: () => invalidateAfterTaskChange(queryClient),
  })
}

/** Module 5's bulk operations, same invalidation shape as the BRD 6.2 bulk hooks above. */
export function useBulkUpdateStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: BulkStatusPayload) => tasksService.bulkStatus(payload),
    onSuccess: () => invalidateAfterTaskChange(queryClient),
  })
}

export function useBulkUpdatePriority() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: BulkPriorityPayload) => tasksService.bulkPriority(payload),
    onSuccess: () => invalidateAfterTaskChange(queryClient),
  })
}

export function useBulkDeleteTasks() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: BulkDeletePayload) => tasksService.bulkDelete(payload),
    onSuccess: () => invalidateAfterTaskChange(queryClient),
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => tasksService.remove(id),
    onSuccess: () => invalidateAfterTaskChange(queryClient),
  })
}
