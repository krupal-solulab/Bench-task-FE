import { PageHeader } from '@/components/layout/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { TaskFilters } from '@/components/tasks/TaskFilters'
import { TaskList } from '@/components/tasks/TaskList'
import { useMyTasks } from '@/hooks/queries/useTasks'
import { usePagination } from '@/hooks/usePagination'
import { useQueryParams } from '@/hooks/useQueryParams'
import { toApiError } from '@/lib/error'
import type { SortOrder } from '@/types/api.types'
import type { TaskListQuery, TaskStatus } from '@/types/task.types'

export function MyTasksPage() {
  const { page, limit, setPage, setLimit } = usePagination()
  const [filters, setFilters] = useQueryParams({
    search: '',
    status: undefined as TaskStatus | undefined,
    priority: undefined as TaskListQuery['priority'],
    dueDateFrom: undefined as string | undefined,
    dueDateTo: undefined as string | undefined,
    overdue: undefined as boolean | undefined,
    sortBy: 'dueDate' as 'dueDate' | 'priority' | 'createdAt' | 'status',
    sortOrder: 'asc' as SortOrder,
  })

  const query = { page, limit, ...filters }
  const { data, isLoading, isError, error, refetch } = useMyTasks(query)

  const hasActiveFilters = !!(
    filters.search ||
    filters.status ||
    filters.priority ||
    filters.dueDateFrom ||
    filters.dueDateTo ||
    filters.overdue
  )

  function handleClear() {
    setFilters({
      search: '',
      status: undefined,
      priority: undefined,
      dueDateFrom: undefined,
      dueDateTo: undefined,
      overdue: undefined,
    })
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My Tasks" description="Tasks assigned to you across all projects" />

      <TaskFilters
        value={filters}
        onChange={(update) => {
          setFilters(update)
          setPage(1)
        }}
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
          setFilters({ sortBy: sortBy as typeof filters.sortBy, sortOrder })
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
