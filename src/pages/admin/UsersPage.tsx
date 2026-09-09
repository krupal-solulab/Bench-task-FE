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
import { UserForm } from '@/components/admin/UserForm'
import { UserTable } from '@/components/admin/UserTable'
import { useUsers } from '@/hooks/queries/useUsers'
import { useCreateUser } from '@/hooks/mutations/useUserMutations'
import { useQueryParams } from '@/hooks/useQueryParams'
import { useToast } from '@/hooks/useToast'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import { isConflictError, toApiError } from '@/lib/error'
import { ORG_ROLES, type Role } from '@/types/user.types'
import type { CreateUserFormValues } from '@/schemas/user.schema'

const ALL = '__all__'

export function UsersPage() {
  const [createOpen, setCreateOpen] = useState(false)
  // Pagination and filters share a single useQueryParams call - see ProjectsListPage for why two
  // separate useQueryParams-backed hooks (e.g. usePagination() + a filters one) would silently
  // discard whichever one's URL update loses the race when their setters fire back-to-back.
  const [state, setState] = useQueryParams({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    search: '',
    role: undefined as Role | undefined,
    sortBy: 'createdAt' as 'name' | 'email' | 'createdAt' | 'role',
    sortOrder: 'desc' as 'asc' | 'desc',
  })
  const filters = state

  const { data, isLoading, isError, error, refetch } = useUsers(state)
  const createUser = useCreateUser()
  const { showToast } = useToast()

  const hasActiveFilters = !!filters.search || !!filters.role

  function setPage(nextPage: number) {
    setState({ page: nextPage })
  }

  function setLimit(nextLimit: number) {
    setState({ limit: nextLimit, page: 1 })
  }

  function handleClear() {
    setState({ search: '', role: undefined, page: 1 })
  }

  async function handleCreate(values: CreateUserFormValues) {
    try {
      await createUser.mutateAsync(values)
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
          onChange={(search) => setState({ search, page: 1 })}
          placeholder="Search by name or email…"
          className="w-64"
        />
        <Select
          value={filters.role ?? ALL}
          onValueChange={(v) => setState({ role: v === ALL ? undefined : (v as Role), page: 1 })}
        >
          <SelectTrigger className="w-40" aria-label="Filter by role">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All roles</SelectItem>
            {ORG_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <UserTable
        users={data?.data ?? []}
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

      <Modal open={createOpen} onOpenChange={setCreateOpen} title="New user">
        <UserForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
      </Modal>
    </div>
  )
}
