import { useState } from 'react'
import { FolderKanban, LayoutGrid, List, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { CardSkeleton } from '@/components/common/Skeleton'
import { Pagination } from '@/components/common/Pagination'
import { Modal } from '@/components/common/Modal'
import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import { AvatarStack } from '@/components/common/Avatar'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { StaggerContainer, StaggerItem } from '@/components/common/Stagger'
import { ProjectFilters, type ProjectFiltersValue } from '@/components/projects/ProjectFilters'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { useProjects } from '@/hooks/queries/useProjects'
import { useCreateProject } from '@/hooks/mutations/useProjectMutations'
import { usePagination } from '@/hooks/usePagination'
import { useQueryParams } from '@/hooks/useQueryParams'
import { usePermissions } from '@/hooks/usePermissions'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import { formatDate } from '@/lib/date'
import type { Project, ProjectStatus } from '@/types/project.types'
import type { ProjectFormValues } from '@/schemas/project.schema'

type ViewMode = 'grid' | 'table'

export function ProjectsListPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [createOpen, setCreateOpen] = useState(false)
  const { page, limit, setPage, setLimit } = usePagination()
  const [filters, setFilters] = useQueryParams({
    search: '',
    status: undefined as ProjectStatus | undefined,
    owner: undefined as string | undefined,
    member: undefined as string | undefined,
    sortBy: 'createdAt' as 'name' | 'dueDate' | 'createdAt' | 'status',
    sortOrder: 'desc' as 'asc' | 'desc',
  })
  const { can } = usePermissions()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const createProject = useCreateProject()

  const query = { page, limit, ...filters }
  const { data, isLoading, isError, error, refetch } = useProjects(query)

  // No user-directory endpoint is available to every role, so the owner filter's option list is
  // derived from the projects the caller can already see (role-scoped by the API) rather than a
  // full directory lookup.
  const { data: ownerSourceData } = useProjects({
    page: 1,
    limit: 100,
    sortBy: 'name',
    sortOrder: 'asc',
  })
  const owners = Array.from(
    new Map((ownerSourceData?.data ?? []).map((p) => [p.owner.id, p.owner])).values(),
  ).map((owner) => ({ id: owner.id, name: owner.name }))

  const hasActiveFilters =
    !!filters.search || !!filters.status || !!filters.owner || !!filters.member

  function handleFilterChange(update: Partial<ProjectFiltersValue>) {
    setFilters(update)
    setPage(1)
  }

  function handleClearFilters() {
    setFilters({ search: '', status: undefined, owner: undefined, member: undefined })
    setPage(1)
  }

  async function handleCreate(values: ProjectFormValues) {
    try {
      const project = await createProject.mutateAsync(values)
      showToast({ title: 'Project created', variant: 'success' })
      setCreateOpen(false)
      navigate(`/projects/${project.id}`)
    } catch (err) {
      showToast({
        title: 'Could not create project',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  const columns: DataTableColumn<Project>[] = [
    { key: 'name', header: 'Name', sortable: true, render: (p) => p.name },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (p) => <StatusBadge status={p.status} kind="project" />,
    },
    { key: 'owner', header: 'Owner', render: (p) => p.owner.name },
    {
      key: 'members',
      header: 'Members',
      render: (p) => <AvatarStack names={p.members.map((m) => m.user.name)} />,
    },
    { key: 'dueDate', header: 'Due date', sortable: true, render: (p) => formatDate(p.dueDate) },
    { key: 'taskCount', header: 'Tasks', render: (p) => p.taskCount },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="All projects you have access to"
        actions={
          can('project:create') && (
            <Button onClick={() => setCreateOpen(true)} className="gap-1">
              <Plus className="h-4 w-4" /> New Project
            </Button>
          )
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ProjectFilters
          value={filters}
          onChange={handleFilterChange}
          onClear={handleClearFilters}
          owners={owners}
        />
        <div className="flex items-center gap-1 rounded-md border p-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('table')}
            aria-label="Table view"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading && viewMode === 'grid' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {isError && <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />}

      {!isLoading && !isError && data && data.data.length === 0 && (
        <EmptyState
          icon={FolderKanban}
          title={hasActiveFilters ? 'No results for these filters' : 'No projects yet'}
          description={
            hasActiveFilters
              ? 'Try a different search or clear your filters.'
              : 'Create your first project to get started.'
          }
          actionLabel={hasActiveFilters ? 'Clear filters' : undefined}
          onAction={hasActiveFilters ? handleClearFilters : undefined}
        />
      )}

      {!isLoading && !isError && data && data.data.length > 0 && (
        <>
          {viewMode === 'grid' ? (
            <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.data.map((project) => (
                <StaggerItem key={project.id}>
                  <ProjectCard project={project} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          ) : (
            <DataTable
              columns={columns}
              data={data.data}
              getRowKey={(p) => p.id}
              sortBy={filters.sortBy}
              sortOrder={filters.sortOrder}
              onSortChange={(sortBy, sortOrder) =>
                setFilters({ sortBy: sortBy as typeof filters.sortBy, sortOrder })
              }
              onRowClick={(p) => navigate(`/projects/${p.id}`)}
            />
          )}

          <Pagination
            page={data.meta.page}
            limit={data.meta.limit}
            total={data.meta.total}
            totalPages={data.meta.totalPages}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </>
      )}

      <Modal open={createOpen} onOpenChange={setCreateOpen} title="New project">
        <ProjectForm
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
          submitLabel="Create"
        />
      </Modal>
    </div>
  )
}
