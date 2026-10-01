import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { Avatar } from '@/components/common/Avatar'
import { Checkbox } from '@/components/ui/checkbox'
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
  /** Module 8 gap-closure - when provided, rows get a selection checkbox (bulk actions). */
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
  /** The acting Admin's own row can't be selected - every bulk action would refuse it anyway. */
  currentUserId?: string
  /** Module 8 gap-closure - when provided, eligible rows (active non-Admins) get "View as". */
  onViewAs?: (user: User) => void
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
  selectedIds,
  onSelectionChange,
  currentUserId,
  onViewAs,
}: UserTableProps) {
  const selectable = users.filter((u) => u.id !== currentUserId)
  const allSelected =
    selectable.length > 0 && selectable.every((u) => selectedIds?.has(u.id) ?? false)

  function toggle(id: string, checked: boolean) {
    if (!selectedIds || !onSelectionChange) return
    const next = new Set(selectedIds)
    if (checked) next.add(id)
    else next.delete(id)
    onSelectionChange(next)
  }

  function toggleAll(checked: boolean) {
    if (!selectedIds || !onSelectionChange) return
    const next = new Set(selectedIds)
    for (const u of selectable) {
      if (checked) next.add(u.id)
      else next.delete(u.id)
    }
    onSelectionChange(next)
  }

  const selectionColumn: DataTableColumn<User>[] =
    selectedIds && onSelectionChange
      ? [
          {
            key: 'select',
            className: 'w-10',
            header: (
              <Checkbox
                aria-label="Select all users on this page"
                checked={allSelected}
                onCheckedChange={(c) => toggleAll(c === true)}
              />
            ),
            render: (u) => (
              <Checkbox
                aria-label={`Select ${u.name}`}
                checked={selectedIds.has(u.id)}
                disabled={u.id === currentUserId}
                onCheckedChange={(c) => toggle(u.id, c === true)}
              />
            ),
          },
        ]
      : []

  const columns: DataTableColumn<User>[] = [
    ...selectionColumn,
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
    ...(onViewAs
      ? [
          {
            key: 'viewAs',
            header: '',
            render: (u: User) =>
              u.role !== 'Admin' && u.isActive && u.id !== currentUserId ? (
                <button
                  type="button"
                  onClick={() => onViewAs(u)}
                  className="whitespace-nowrap text-xs text-primary underline"
                  aria-label={`View as ${u.name}`}
                >
                  View as
                </button>
              ) : null,
          },
        ]
      : []),
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
