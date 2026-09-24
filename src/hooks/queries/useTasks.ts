import { useQuery } from '@tanstack/react-query'
import { QUERY_STALE_TIME, queryKeys } from '@/lib/constants'
import { tasksService } from '@/services/tasks.service'
import type { TaskListQuery, TaskSearchQuery } from '@/types/task.types'

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

/** Only meaningful for an Epic - pass its own issueType check up at the call site. */
export function useEpicProgress(id: string | undefined, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.tasks.epicProgress(id ?? ''),
    queryFn: () => tasksService.epicProgress(id!),
    enabled: !!id && (options.enabled ?? true),
  })
}

/** JQL-lite compound search (Search/Dashboards v2) - disabled until a query has actually been
 * submitted (a partial/empty `jql` while the user is still typing should not fire a request). */
export function useTaskSearch(query: TaskSearchQuery | null) {
  return useQuery({
    queryKey: queryKeys.tasks.search(query),
    queryFn: () => tasksService.search(query!),
    enabled: !!query?.jql,
  })
}

/** Module 4's Issue Navigator autocomplete metadata - static per-deploy, so a long staleTime
 * avoids re-fetching it on every keystroke's re-render. */
export function useJqlAutocompleteFields() {
  return useQuery({
    queryKey: queryKeys.tasks.autocompleteFields,
    queryFn: () => tasksService.autocompleteFields(),
    staleTime: Infinity,
  })
}

/** Dynamic value suggestions for one JQL field at a time - only fetched once the autocomplete
 * logic has actually determined that field is the one currently being completed. */
export function useJqlAutocompleteValues(field: string | null) {
  return useQuery({
    queryKey: queryKeys.tasks.autocompleteValues(field ?? ''),
    queryFn: () => tasksService.autocompleteValues(field!),
    enabled: !!field,
    staleTime: 60_000,
  })
}
