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
import { usePagination } from '@/hooks/usePagination'
import { useQueryParams } from '@/hooks/useQueryParams'
import { useToast } from '@/hooks/useToast'
import { isConflictError, toApiError } from '@/lib/error'
import { ORGANIZATION_STATUSES, type OrganizationStatus } from '@/types/organization.types'
import type { CreateOrganizationFormValues } from '@/schemas/organization.schema'

const ALL = '__all__'

export function PlatformOrganizationsListPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const { page, limit, setPage, setLimit } = usePagination()
  const [filters, setFilters] = useQueryParams({
    search: '',
    status: undefined as OrganizationStatus | undefined,
    sortBy: 'createdAt' as 'name' | 'status' | 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc',
  })

  const query = { page, limit, ...filters }
  const { data, isLoading, isError, error, refetch } = useOrganizations(query)
  const createOrganization = useCreateOrganization()
  const { showToast } = useToast()

  const hasActiveFilters = !!filters.search || !!filters.status

  function handleClear() {
    setFilters({ search: '', status: undefined })
    setPage(1)
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
          onChange={(search) => {
            setFilters({ search })
            setPage(1)
          }}
          placeholder="Search by name or slug…"
          className="w-64"
        />
        <Select
          value={filters.status ?? ALL}
          onValueChange={(v) => {
            setFilters({ status: v === ALL ? undefined : (v as OrganizationStatus) })
            setPage(1)
          }}
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
          setFilters({ sortBy: sortBy as typeof filters.sortBy, sortOrder })
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
