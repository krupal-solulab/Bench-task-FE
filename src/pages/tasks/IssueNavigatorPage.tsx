import { useState } from 'react'
import { Download } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Pagination } from '@/components/common/Pagination'
import { AdvancedSearchInput } from '@/components/tasks/AdvancedSearchInput'
import { IssueNavigatorTable } from '@/components/tasks/IssueNavigatorTable'
import { useTaskSearch } from '@/hooks/queries/useTasks'
import { useExportSearchCsv } from '@/hooks/mutations/useTaskMutations'
import { useToast } from '@/hooks/useToast'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import { downloadTextFile } from '@/lib/download'
import { toApiError } from '@/lib/error'

/**
 * Module 4's Issue Navigator (BRD: "a real JQL query language ... plus a spreadsheet-style issue
 * table") - an org-wide JQL search surface, distinct from My Tasks' own "advanced search" toggle
 * (which stays scoped under its assignee-= -me default). Uses IssueNavigatorTable (reorderable/
 * resizable columns, inline-edit for priority/assignee - Module 4 gap-closure) instead of the
 * plain TaskList every other task list uses, plus AdvancedSearchInput with autocomplete and
 * inline error-position highlighting (see jql-autocomplete.ts).
 */
export function IssueNavigatorPage() {
  const [jql, setJql] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE)
  const result = useTaskSearch(jql ? { jql, page, limit } : null)
  const exportCsv = useExportSearchCsv()
  const { showToast } = useToast()

  async function handleExport() {
    if (!jql) return
    try {
      const csvResult = await exportCsv.mutateAsync(jql)
      downloadTextFile(csvResult.filename, csvResult.csv, 'text/csv;charset=utf-8')
    } catch (err) {
      showToast({
        title: 'Could not export search results',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

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
        errorPosition={result.isError ? toApiError(result.error).position : undefined}
      />

      {!jql ? (
        <EmptyState
          title="Run a query to get started"
          description="Type a query above and press Search - e.g. status != Done AND priority IN (P1, P2) ORDER BY dueDate."
        />
      ) : (
        <>
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => void handleExport()}
              loading={exportCsv.isPending}
            >
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
          <IssueNavigatorTable
            tasks={result.data?.data ?? []}
            isLoading={result.isLoading}
            isError={result.isError}
            errorMessage={result.isError ? toApiError(result.error).message : undefined}
            onRetry={() => void result.refetch()}
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
