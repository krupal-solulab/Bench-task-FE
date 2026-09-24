import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { Pagination } from '@/components/common/Pagination'
import { AdvancedSearchInput } from '@/components/tasks/AdvancedSearchInput'
import { TaskList } from '@/components/tasks/TaskList'
import { useTaskSearch } from '@/hooks/queries/useTasks'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import { toApiError } from '@/lib/error'

/**
 * Module 4's Issue Navigator (BRD: "a real JQL query language ... plus a spreadsheet-style issue
 * table") - an org-wide JQL search surface, distinct from My Tasks' own "advanced search" toggle
 * (which stays scoped under its assignee-= -me default). Reuses TaskList, which is already a
 * DataTable-backed spreadsheet-style table, and AdvancedSearchInput, now with autocomplete
 * (see jql-autocomplete.ts) - no new table/search-bar component was needed for either half.
 */
export function IssueNavigatorPage() {
  const [jql, setJql] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE)
  const result = useTaskSearch(jql ? { jql, page, limit } : null)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Issue Navigator"
        description="Search every issue you can access with a JQL-lite query"
      />

      <AdvancedSearchInput
        activeQuery={jql}
        onSearch={(next) => {
          setJql(next)
          setPage(1)
        }}
        onClear={() => setJql(null)}
        isLoading={result.isLoading}
        error={result.isError ? toApiError(result.error).message : undefined}
      />

      {!jql ? (
        <EmptyState
          title="Run a query to get started"
          description="Type a query above and press Search - e.g. status != Done AND priority IN (P1, P2) ORDER BY dueDate."
        />
      ) : (
        <>
          <TaskList
            tasks={result.data?.data ?? []}
            isLoading={result.isLoading}
            isError={result.isError}
            errorMessage={result.isError ? toApiError(result.error).message : undefined}
            onRetry={() => void result.refetch()}
            showProject
          />
          {result.data && (
            <Pagination
              page={result.data.meta.page}
              limit={result.data.meta.limit}
              total={result.data.meta.total}
              totalPages={result.data.meta.totalPages}
              onPageChange={setPage}
              onLimitChange={(nextLimit) => {
                setLimit(nextLimit)
                setPage(1)
              }}
            />
          )}
        </>
      )}
    </div>
  )
}
