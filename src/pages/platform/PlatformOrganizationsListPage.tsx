import { useState } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { SearchInput } from '@/components/common/SearchInput'
import { Pagination } from '@/components/common/Pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { OrganizationForm } from '@/components/platform/OrganizationForm'
import { OrganizationTable } from '@/components/platform/OrganizationTable'
import { useOrganizations } from '@/hooks/queries/useOrganizations'
import { useCreateOrganization } from '@/hooks/mutations/useOrganizationMutations'
import { useQueryParams } from '@/hooks/useQueryParams'
import { useToast } from '@/hooks/useToast'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import { isConflictError, toApiError } from '@/lib/error'
import { ORGANIZATION_STATUSES, type OrganizationStatus } from '@/types/organization.types'
import type { CreateOrganizationFormValues } from '@/schemas/organization.schema'

const ALL = '__all__'

export function PlatformOrganizationsListPage() {
  const [createOpen, setCreateOpen] = useState(false)
  // Pagination and filters share a single useQueryParams call - see ProjectsListPage for why two
  // separate useQueryParams-backed hooks (e.g. usePagination() + a filters one) would silently
  // discard whichever one's URL update loses the race when their setters fire back-to-back.
  const [state, setState] = useQueryParams({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    search: '',
    status: undefined as OrganizationStatus | undefined,
    sortBy: 'createdAt' as 'name' | 'status' | 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc',
  })
  const filters = state

  const { data, isLoading, isError, error, refetch } = useOrganizations(state)
  const createOrganization = useCreateOrganization()
  const { showToast } = useToast()

  const hasActiveFilters = !!filters.search || !!filters.status

  function setPage(nextPage: number) {
    setState({ page: nextPage })
  }

  function setLimit(nextLimit: number) {
    setState({ limit: nextLimit, page: 1 })
  }

  function handleClear() {
    setState({ search: '', status: undefined, page: 1 })
  }

  async function handleCreate(values: CreateOrganizationFormValues) {
    try {
      await createOrganization.mutateAsync(values)
      showToast({ title: 'Organization created', variant: 'success' })
      setCreateOpen(false)
    } catch (err) {
      if (isConflictError(err)) {
        throw new Error('DUPLICATE_EMAIL')
      }
      showToast({
        title: 'Could not create organization',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizations"
        description="Manage tenant organizations and their admins"
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" /> New Organization
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={filters.search}
          onChange={(search) => setState({ search, page: 1 })}
          placeholder="Search by name or slug…"
          className="w-64"
        />
        <Select
          value={filters.status ?? ALL}
          onValueChange={(v) =>
            setState({ status: v === ALL ? undefined : (v as OrganizationStatus), page: 1 })
          }
        >
          <SelectTrigger className="w-40" aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {ORGANIZATION_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <OrganizationTable
        organizations={data?.data ?? []}
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

      <Modal open={createOpen} onOpenChange={setCreateOpen} title="New organization">
        <OrganizationForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
      </Modal>
    </div>
  )
}
