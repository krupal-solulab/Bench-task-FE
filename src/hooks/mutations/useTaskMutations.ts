import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants'
import { tasksService } from '@/services/tasks.service'
import type {
  CreateTaskPayload,
  Task,
  TaskStatus,
  UpdateTaskAssigneePayload,
  UpdateTaskPayload,
} from '@/types/task.types'

function invalidateAfterTaskChange(queryClient: ReturnType<typeof useQueryClient>, task?: Task) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
  if (task) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(task.project.id) })
  }
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
    mutationFn: (status: TaskStatus) => tasksService.updateStatus(id, { status }),
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
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
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

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => tasksService.remove(id),
    onSuccess: () => invalidateAfterTaskChange(queryClient),
  })
}
