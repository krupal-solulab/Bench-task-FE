import { Link } from 'react-router-dom'
import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/date'
import type { SortOrder } from '@/types/api.types'
import type { Organization } from '@/types/organization.types'

export interface OrganizationTableProps {
  organizations: Organization[]
  isLoading: boolean
  isError: boolean
  errorMessage?: string
  onRetry: () => void
  sortBy?: string
  sortOrder?: SortOrder
  onSortChange?: (sortBy: string, sortOrder: SortOrder) => void
  hasActiveFilters?: boolean
  onClearFilters?: () => void
}

const STATUS_CLASSES: Record<Organization['status'], string> = {
  Active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Suspended: 'bg-red-100 text-red-700 border-red-200',
}

function OrganizationStatusBadge({ status }: { status: Organization['status'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        STATUS_CLASSES[status],
      )}
    >
      {status}
    </span>
  )
}

export function OrganizationTable({
  organizations,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  sortBy,
  sortOrder,
  onSortChange,
  hasActiveFilters,
  onClearFilters,
}: OrganizationTableProps) {
  const columns: DataTableColumn<Organization>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (org) => (
        <Link
          to={`/platform/organizations/${org.id}`}
          className="font-medium text-foreground hover:text-primary hover:underline"
        >
          {org.name}
        </Link>
      ),
    },
    { key: 'slug', header: 'Slug', render: (org) => org.slug },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (org) => <OrganizationStatusBadge status={org.status} />,
    },
    { key: 'userCount', header: 'Users', render: (org) => org.userCount },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (org) => formatDate(org.createdAt),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={organizations}
      getRowKey={(org) => org.id}
      isLoading={isLoading}
      isError={isError}
      errorMessage={errorMessage}
      onRetry={onRetry}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={onSortChange}
      emptyState={
        <EmptyState
          title={hasActiveFilters ? 'No results for these filters' : 'No organizations yet'}
          actionLabel={hasActiveFilters ? 'Clear filters' : undefined}
          onAction={hasActiveFilters ? onClearFilters : undefined}
        />
      }
    />
  )
}
