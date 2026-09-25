import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { DatePicker } from '@/components/common/DatePicker'
import { Pagination } from '@/components/common/Pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AuditLogTable } from '@/components/admin/AuditLogTable'
import { useAuditLog } from '@/hooks/queries/useAuditLog'
import { useUsers } from '@/hooks/queries/useUsers'
import { useQueryParams } from '@/hooks/useQueryParams'
import { formatAuditAction } from '@/lib/audit-log'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import { toApiError } from '@/lib/error'
import { AUDIT_ACTIONS, type AuditAction } from '@/types/audit-log.types'

const ALL = '__all__'

export function AuditLogPage() {
  // Single useQueryParams call for page+filters together - see PlatformApiLogsPage for why two
  // separate hook instances would silently clobber each other's URL writes.
  const [state, setState] = useQueryParams({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    action: undefined as AuditAction | undefined,
    actorId: undefined as string | undefined,
    dateFrom: undefined as string | undefined,
    dateTo: undefined as string | undefined,
  })
  const filters = state

  const { data, isLoading, isError, error, refetch } = useAuditLog(state)
  const { data: usersData } = useUsers({ page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' })

  const hasActiveFilters =
    !!filters.action || !!filters.actorId || !!filters.dateFrom || !!filters.dateTo

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
      action: undefined,
      actorId: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      page: 1,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Who changed what: user lifecycle, org settings, and scheme/team/role changes"
      />

      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-soft">
        <div className="w-56 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Action</label>
          <Select
            value={filters.action ?? ALL}
            onValueChange={(v) =>
              updateFilters({ action: v === ALL ? undefined : (v as AuditAction) })
            }
          >
            <SelectTrigger aria-label="Filter by action">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All actions</SelectItem>
              {AUDIT_ACTIONS.map((action) => (
                <SelectItem key={action} value={action}>
                  {formatAuditAction(action)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-48 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Actor</label>
          <Select
            value={filters.actorId ?? ALL}
            onValueChange={(v) => updateFilters({ actorId: v === ALL ? undefined : v })}
          >
            <SelectTrigger aria-label="Filter by actor">
              <SelectValue placeholder="Everyone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Everyone</SelectItem>
              {(usersData?.data ?? []).map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-40 space-y-1">
          <label
            htmlFor="audit-log-date-from"
            className="text-xs font-medium text-muted-foreground"
          >
            From
          </label>
          <DatePicker
            id="audit-log-date-from"
            value={filters.dateFrom}
            max={filters.dateTo ?? undefined}
            onChange={(v) => updateFilters({ dateFrom: v ?? undefined })}
          />
        </div>

        <div className="w-40 space-y-1">
          <label htmlFor="audit-log-date-to" className="text-xs font-medium text-muted-foreground">
            To
          </label>
          <DatePicker
            id="audit-log-date-to"
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

      <AuditLogTable
        entries={data?.data ?? []}
        isLoading={isLoading}
        isError={isError}
        errorMessage={isError ? toApiError(error).message : undefined}
        onRetry={() => void refetch()}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClear}
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
