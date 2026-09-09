import { PageHeader } from '@/components/layout/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { TaskFilters } from '@/components/tasks/TaskFilters'
import { TaskList } from '@/components/tasks/TaskList'
import { useMyTasks } from '@/hooks/queries/useTasks'
import { useQueryParams } from '@/hooks/useQueryParams'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import { toApiError } from '@/lib/error'
import type { SortOrder } from '@/types/api.types'
import type { TaskListQuery, TaskStatus } from '@/types/task.types'

export function MyTasksPage() {
  // Pagination and filters share a single useQueryParams call - see ProjectsListPage for why two
  // separate useQueryParams-backed hooks (e.g. usePagination() + a filters one) would silently
  // discard whichever one's URL update loses the race when their setters fire back-to-back.
  const [state, setState] = useQueryParams({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    search: '',
    status: undefined as TaskStatus | undefined,
    priority: undefined as TaskListQuery['priority'],
    dueDateFrom: undefined as string | undefined,
    dueDateTo: undefined as string | undefined,
    overdue: undefined as boolean | undefined,
    sortBy: 'dueDate' as 'dueDate' | 'priority' | 'createdAt' | 'status',
    sortOrder: 'asc' as SortOrder,
  })
  const filters = state

  const { data, isLoading, isError, error, refetch } = useMyTasks(state)

  const hasActiveFilters = !!(
    filters.search ||
    filters.status ||
    filters.priority ||
    filters.dueDateFrom ||
    filters.dueDateTo ||
    filters.overdue
  )

  function setPage(nextPage: number) {
    setState({ page: nextPage })
  }

  function setLimit(nextLimit: number) {
    setState({ limit: nextLimit, page: 1 })
  }

  function handleClear() {
    setState({
      search: '',
      status: undefined,
      priority: undefined,
      dueDateFrom: undefined,
      dueDateTo: undefined,
      overdue: undefined,
      page: 1,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My Tasks" description="Tasks assigned to you across all projects" />

      <TaskFilters
        value={filters}
        onChange={(update) => setState({ ...update, page: 1 })}
        onClear={handleClear}
        hideAssignee
      />

      <TaskList
        tasks={data?.data ?? []}
        isLoading={isLoading}
        isError={isError}
        errorMessage={isError ? toApiError(error).message : undefined}
        onRetry={() => void refetch()}
        sortBy={filters.sortBy}
        sortOrder={filters.sortOrder}
        onSortChange={(sortBy, sortOrder) =>
          setState({ sortBy: sortBy as typeof filters.sortBy, sortOrder })
        }
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClear}
        showProject
      />

      {data && (
        <Pagination
          page={data.meta.page}
          limit={data.meta.limit}
          total={data.meta.total}
          totalPages={data.meta.totalPages}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      )}
    </div>
  )
}
