import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { SearchInput } from '@/components/common/SearchInput'
import { DatePicker } from '@/components/common/DatePicker'
import { Pagination } from '@/components/common/Pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ApiLogTable } from '@/components/platform/ApiLogTable'
import { ApiLogDetailModal } from '@/components/platform/ApiLogDetailModal'
import { useApiLogs } from '@/hooks/queries/useApiLogs'
import { useOrganizations } from '@/hooks/queries/useOrganizations'
import { useQueryParams } from '@/hooks/useQueryParams'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import { toApiError } from '@/lib/error'
import {
  API_LOG_METHODS,
  API_LOG_STATUS_CLASSES,
  type ApiLogMethod,
  type ApiLogStatusClass,
} from '@/types/api-log.types'

const ALL = '__all__'

export function PlatformApiLogsPage() {
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null)
  // Pagination and filters are read from a single useQueryParams call (rather than a separate
  // usePagination() + useQueryParams() pair) - two independent hook instances each capture their
  // own stale snapshot of the URL, so calling their setters back-to-back (as filter changes need
  // to, to also reset the page) makes the second call silently overwrite the first's change.
  const [state, setState] = useQueryParams({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    organizationId: undefined as string | undefined,
    method: undefined as ApiLogMethod | undefined,
    statusClass: undefined as ApiLogStatusClass | undefined,
    path: '',
    dateFrom: undefined as string | undefined,
    dateTo: undefined as string | undefined,
  })
  const filters = state

  const { data, isLoading, isError, error, refetch } = useApiLogs(state)
  const { data: orgsData } = useOrganizations({
    page: 1,
    limit: 100,
    sortBy: 'name',
    sortOrder: 'asc',
  })

  const hasActiveFilters =
    !!filters.organizationId ||
    !!filters.method ||
    !!filters.statusClass ||
    !!filters.path ||
    !!filters.dateFrom ||
    !!filters.dateTo

  function updateFilters(update: Partial<typeof filters>) {
    setState({ ...update, page: 1 })
  }

  function setPage(nextPage: number) {
    setState({ page: nextPage })
  }

  function setLimit(nextLimit: number) {
    setState({ limit: nextLimit, page: 1 })
  }

  function handleClear() {
    setState({
      organizationId: undefined,
      method: undefined,
      statusClass: undefined,
      path: '',
      dateFrom: undefined,
      dateTo: undefined,
      page: 1,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Logs"
        description="Review recent API activity across every organization"
      />

      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-soft">
        <div className="w-56 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Path</label>
          <SearchInput
            value={filters.path}
            onChange={(path) => updateFilters({ path })}
            placeholder="Search path…"
          />
        </div>

        <div className="w-48 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Organization</label>
          <Select
            value={filters.organizationId ?? ALL}
            onValueChange={(v) => updateFilters({ organizationId: v === ALL ? undefined : v })}
          >
            <SelectTrigger aria-label="Filter by organization">
              <SelectValue placeholder="All organizations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All organizations</SelectItem>
              {(orgsData?.data ?? []).map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-36 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Method</label>
          <Select
            value={filters.method ?? ALL}
            onValueChange={(v) =>
              updateFilters({ method: v === ALL ? undefined : (v as ApiLogMethod) })
            }
          >
            <SelectTrigger aria-label="Filter by method">
              <SelectValue placeholder="All methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All methods</SelectItem>
              {API_LOG_METHODS.map((method) => (
                <SelectItem key={method} value={method}>
                  {method}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-36 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <Select
            value={filters.statusClass ?? ALL}
            onValueChange={(v) =>
              updateFilters({ statusClass: v === ALL ? undefined : (v as ApiLogStatusClass) })
            }
          >
            <SelectTrigger aria-label="Filter by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {API_LOG_STATUS_CLASSES.map((statusClass) => (
                <SelectItem key={statusClass} value={statusClass}>
                  {statusClass}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-40 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">From</label>
          <DatePicker
            value={filters.dateFrom}
            max={filters.dateTo ?? undefined}
            onChange={(v) => updateFilters({ dateFrom: v ?? undefined })}
          />
        </div>

        <div className="w-40 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">To</label>
          <DatePicker
            value={filters.dateTo}
            min={filters.dateFrom ?? undefined}
            onChange={(v) => updateFilters({ dateTo: v ?? undefined })}
          />
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            Clear filters
          </Button>
        )}
      </div>

      <ApiLogTable
        logs={data?.data ?? []}
        isLoading={isLoading}
        isError={isError}
        errorMessage={isError ? toApiError(error).message : undefined}
        onRetry={() => void refetch()}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClear}
        onRowClick={(log) => setSelectedLogId(log.id)}
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

      <ApiLogDetailModal
        logId={selectedLogId}
        onOpenChange={(open) => !open && setSelectedLogId(null)}
      />
    </div>
  )
}
