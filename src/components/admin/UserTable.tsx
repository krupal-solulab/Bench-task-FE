import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { Avatar } from '@/components/common/Avatar'
import { RoleSelect } from './RoleSelect'
import { UserStatusToggle } from './UserStatusToggle'
import { formatDate } from '@/lib/date'
import type { SortOrder } from '@/types/api.types'
import type { User } from '@/types/user.types'

export interface UserTableProps {
  users: User[]
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

export function UserTable({
  users,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  sortBy,
  sortOrder,
  onSortChange,
  hasActiveFilters,
  onClearFilters,
}: UserTableProps) {
  const columns: DataTableColumn<User>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (u) => (
        <span className="flex items-center gap-2">
          <Avatar name={u.name} size="sm" /> {u.name}
        </span>
      ),
    },
    { key: 'email', header: 'Email', sortable: true, render: (u) => u.email },
    { key: 'role', header: 'Role', sortable: true, render: (u) => <RoleSelect user={u} /> },
    { key: 'isActive', header: 'Active', render: (u) => <UserStatusToggle user={u} /> },
    { key: 'createdAt', header: 'Created', sortable: true, render: (u) => formatDate(u.createdAt) },
  ]

  return (
    <DataTable
      columns={columns}
      data={users}
      getRowKey={(u) => u.id}
      isLoading={isLoading}
      isError={isError}
      errorMessage={errorMessage}
      onRetry={onRetry}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={onSortChange}
      emptyState={
        <EmptyState
          title={hasActiveFilters ? 'No results for these filters' : 'No users yet'}
          actionLabel={hasActiveFilters ? 'Clear filters' : undefined}
          onAction={hasActiveFilters ? onClearFilters : undefined}
        />
      }
    />
  )
}
