import { useContext, useState } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { SearchInput } from '@/components/common/SearchInput'
import { Pagination } from '@/components/common/Pagination'
import { UserForm } from '@/components/admin/UserForm'
import { UserTable } from '@/components/admin/UserTable'
import { UserBulkActionBar } from '@/components/admin/UserBulkActionBar'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { AuthContext } from '@/context/AuthContext'
import { useUsers } from '@/hooks/queries/useUsers'
import { useCreateUser } from '@/hooks/mutations/useUserMutations'
import { useQueryParams } from '@/hooks/useQueryParams'
import { useToast } from '@/hooks/useToast'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import { isConflictError, toApiError } from '@/lib/error'
import type { User } from '@/types/user.types'
import type { CreateUserFormValues } from '@/schemas/user.schema'

const ALL = '__all__'

import { RoleChoiceSelect } from '@/components/admin/RoleChoiceSelect'
import { useCustomRoles } from '@/hooks/queries/useCustomRoles'
import { fromRoleChoice } from '@/lib/roles'

export function UsersPage() {
  const [createOpen, setCreateOpen] = useState(false)
  // Module 8 gap-closure - bulk-action selection. Cleared whenever the visible page/filters change
  // so a bulk action never silently applies to rows the Admin can no longer see.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  // Read optionally (not useAuth()) - only used to disable the Admin's own checkbox, and the page
  // must still render where no AuthProvider is mounted.
  const auth = useContext(AuthContext)
  const currentUser = auth?.user
  const [viewAsTarget, setViewAsTarget] = useState<User | null>(null)
  // Pagination and filters share a single useQueryParams call - see ProjectsListPage for why two
  // separate useQueryParams-backed hooks (e.g. usePagination() + a filters one) would silently
  // discard whichever one's URL update loses the race when their setters fire back-to-back.
  const [state, setState] = useQueryParams({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    search: '',
    // A RoleChoice: a built-in role, or custom:<id> for a custom role (QA, DevOps, ...).
    role: undefined as string | undefined,
    sortBy: 'createdAt' as 'name' | 'email' | 'createdAt' | 'role',
    sortOrder: 'desc' as 'asc' | 'desc',
  })
  const filters = state

  const { data: customRoles } = useCustomRoles()
  const roleFilter = filters.role ? fromRoleChoice(filters.role, customRoles) : null
  const { data, isLoading, isError, error, refetch } = useUsers({
    ...state,
    role: roleFilter && !roleFilter.customRoleId ? roleFilter.role : undefined,
    customRoleId: roleFilter?.customRoleId ?? undefined,
  })
  const createUser = useCreateUser()
  const { showToast } = useToast()

  const hasActiveFilters = !!filters.search || !!filters.role

  function setPage(nextPage: number) {
    setSelectedIds(new Set())
    setState({ page: nextPage })
  }

  function setLimit(nextLimit: number) {
    setSelectedIds(new Set())
    setState({ limit: nextLimit, page: 1 })
  }

  function handleClear() {
    setSelectedIds(new Set())
    setState({ search: '', role: undefined, page: 1 })
  }

  async function handleCreate(values: CreateUserFormValues) {
    try {
      const { role, customRoleId } = fromRoleChoice(values.role, customRoles)
      await createUser.mutateAsync({ ...values, role, customRoleId })
      showToast({ title: 'User created', variant: 'success' })
      setCreateOpen(false)
    } catch (err) {
      if (isConflictError(err)) {
        throw new Error('DUPLICATE_EMAIL')
      }
      showToast({
        title: 'Could not create user',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage accounts, roles, and access"
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" /> New User
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={filters.search}
          onChange={(search) => {
            setSelectedIds(new Set())
            setState({ search, page: 1 })
          }}
          placeholder="Search by name or email…"
          className="w-64"
        />
        <RoleChoiceSelect
          value={filters.role ?? ALL}
          onChange={(v) => {
            setSelectedIds(new Set())
            setState({ role: v === ALL ? undefined : v, page: 1 })
          }}
          allOption={{ value: ALL, label: 'All roles' }}
          className="w-44"
          ariaLabel="Filter by role"
          placeholder="All roles"
        />
      </div>

      {selectedIds.size > 0 && (
        <UserBulkActionBar selectedIds={selectedIds} onDone={() => setSelectedIds(new Set())} />
      )}

      <UserTable
        users={data?.data ?? []}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        currentUserId={currentUser?.id}
        onViewAs={auth?.startImpersonation ? setViewAsTarget : undefined}
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

      <ConfirmDialog
        open={!!viewAsTarget}
        onOpenChange={(open) => !open && setViewAsTarget(null)}
        title={`View as ${viewAsTarget?.name ?? ''}`}
        description="You'll see the app exactly as this user does, read-only, for up to 15 minutes. Nothing can be changed while viewing as them. This is recorded in the audit log."
        confirmLabel="View as"
        onConfirm={async () => {
          if (!viewAsTarget) return
          try {
            await auth?.startImpersonation?.(viewAsTarget.id)
          } catch (err) {
            showToast({
              title: 'Could not view as this user',
              description: toApiError(err).message,
              variant: 'destructive',
            })
          }
        }}
      />

      <Modal open={createOpen} onOpenChange={setCreateOpen} title="New user">
        <UserForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
      </Modal>
    </div>
  )
}
