import { useQuery } from '@tanstack/react-query'
import { QUERY_STALE_TIME, queryKeys } from '@/lib/constants'
import { tasksService } from '@/services/tasks.service'
import type { TaskListQuery } from '@/types/task.types'

export function useTasks(query: TaskListQuery) {
  return useQuery({
    queryKey: queryKeys.tasks.list(query),
    queryFn: () => tasksService.list(query),
    staleTime: QUERY_STALE_TIME.list,
    placeholderData: (prev) => prev,
  })
}

export function useMyTasks(query: TaskListQuery) {
  return useQuery({
    queryKey: queryKeys.tasks.myTasks(query),
    queryFn: () => tasksService.myTasks(query),
    staleTime: QUERY_STALE_TIME.list,
    placeholderData: (prev) => prev,
  })
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(id ?? ''),
    queryFn: () => tasksService.get(id!),
    enabled: !!id,
  })
}

export function useTaskActivity(id: string | undefined, page: number, limit: number) {
  return useQuery({
    queryKey: queryKeys.tasks.activity(id ?? ''),
    queryFn: () => tasksService.activity(id!, { page, limit }),
    enabled: !!id,
  })
}
