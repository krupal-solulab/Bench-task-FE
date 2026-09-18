import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { Pagination } from '@/components/common/Pagination'
import { TaskFilters } from '@/components/tasks/TaskFilters'
import { AdvancedSearchInput } from '@/components/tasks/AdvancedSearchInput'
import { SavedFiltersMenu } from '@/components/tasks/SavedFiltersMenu'
import { TaskList } from '@/components/tasks/TaskList'
import { useMyTasks, useTaskSearch } from '@/hooks/queries/useTasks'
import { useQueryParams } from '@/hooks/useQueryParams'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import { toApiError } from '@/lib/error'
import type { SortOrder } from '@/types/api.types'
import type { TaskListQuery } from '@/types/task.types'

export function MyTasksPage() {
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [activeJql, setActiveJql] = useState<string | null>(null)
  const [searchPage, setSearchPage] = useState(1)
  const [searchLimit, setSearchLimit] = useState(DEFAULT_PAGE_SIZE)
  const searchResult = useTaskSearch(
    activeJql ? { jql: activeJql, page: searchPage, limit: searchLimit } : null,
  )
  // Pagination and filters share a single useQueryParams call - see ProjectsListPage for why two
  // separate useQueryParams-backed hooks (e.g. usePagination() + a filters one) would silently
  // discard whichever one's URL update loses the race when their setters fire back-to-back.
  const [state, setState] = useQueryParams({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    search: '',
    status: undefined as string | undefined,
    priority: undefined as TaskListQuery['priority'],
    dueDateFrom: undefined as string | undefined,
    dueDateTo: undefined as string | undefined,
    overdue: undefined as boolean | undefined,
    sortBy: 'dueDate' as NonNullable<TaskListQuery['sortBy']>,
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

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAdvancedSearch((v) => !v)}
        >
          {showAdvancedSearch ? 'Hide advanced search' : 'Advanced search'}
        </Button>
        <SavedFiltersMenu
          scope="myTasks"
          currentQuery={{
            search: filters.search,
            status: filters.status,
            priority: filters.priority,
            dueDateFrom: filters.dueDateFrom,
            dueDateTo: filters.dueDateTo,
            overdue: filters.overdue,
          }}
          onApply={(query) => setState({ ...(query as Partial<typeof filters>), page: 1 })}
        />
      </div>

      {showAdvancedSearch && (
        <AdvancedSearchInput
          activeQuery={activeJql}
          onSearch={(jql) => {
            setActiveJql(jql)
            setSearchPage(1)
          }}
          onClear={() => setActiveJql(null)}
          isLoading={searchResult.isLoading}
          error={searchResult.isError ? toApiError(searchResult.error).message : undefined}
        />
      )}

      {activeJql ? (
        <>
          <TaskList
            tasks={searchResult.data?.data ?? []}
            isLoading={searchResult.isLoading}
            isError={searchResult.isError}
            errorMessage={searchResult.isError ? toApiError(searchResult.error).message : undefined}
            onRetry={() => void searchResult.refetch()}
            showProject
          />
          {searchResult.data && (
            <Pagination
              page={searchResult.data.meta.page}
              limit={searchResult.data.meta.limit}
              total={searchResult.data.meta.total}
              totalPages={searchResult.data.meta.totalPages}
              onPageChange={setSearchPage}
              onLimitChange={(limit) => {
                setSearchLimit(limit)
                setSearchPage(1)
              }}
            />
          )}
        </>
      ) : (
        <>
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
        </>
      )}
    </div>
  )
}
