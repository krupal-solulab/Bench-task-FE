import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Modal } from '@/components/common/Modal'
import { ErrorState } from '@/components/common/ErrorState'
import { CardSkeleton } from '@/components/common/Skeleton'
import { Avatar } from '@/components/common/Avatar'
import { StaggerContainer, StaggerItem } from '@/components/common/Stagger'
import { StatCard } from '@/components/dashboard/StatCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { ProjectStatusControl } from '@/components/projects/ProjectStatusControl'
import { MemberManager } from '@/components/projects/MemberManager'
import { ProjectActivityFeed } from '@/components/projects/ProjectActivityFeed'
import { TaskBoard } from '@/components/tasks/TaskBoard'
import { TaskList } from '@/components/tasks/TaskList'
import { TaskFilters } from '@/components/tasks/TaskFilters'
import { TaskForm } from '@/components/tasks/TaskForm'
import { useProject, useProjectStats, useProjectTasks } from '@/hooks/queries/useProjects'
import { useDeleteProject, useUpdateProject } from '@/hooks/mutations/useProjectMutations'
import { useCreateTask } from '@/hooks/mutations/useTaskMutations'
import { useQueryParams } from '@/hooks/useQueryParams'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { formatDate } from '@/lib/date'
import { toApiError } from '@/lib/error'
import type { ProjectFormValues } from '@/schemas/project.schema'
import type { TaskFormValues } from '@/schemas/task.schema'
import type { TaskListQuery, TaskStatus } from '@/types/task.types'

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { hasRole, user } = useAuth()

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [createTaskOpen, setCreateTaskOpen] = useState(false)
  const [filters, setFilters] = useQueryParams({
    search: '',
    status: undefined as TaskStatus | undefined,
    priority: undefined as TaskListQuery['priority'],
    assignee: undefined as string | undefined,
    dueDateFrom: undefined as string | undefined,
    dueDateTo: undefined as string | undefined,
    overdue: undefined as boolean | undefined,
  })

  const { data: project, isLoading, isError, error, refetch } = useProject(id)
  const { data: tasksData } = useProjectTasks(id, { page: 1, limit: 100, ...filters })
  const { data: stats } = useProjectStats(id)

  const updateProject = useUpdateProject(id ?? '')
  const deleteProject = useDeleteProject()
  const createTask = useCreateTask()

  if (isLoading) {
    return <CardSkeleton />
  }

  if (isError || !project) {
    return <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
  }

  const canManage = hasRole('Admin') || (hasRole('Manager') && project.owner.id === user?.id)
  const memberIds = project.members.map((m) => m.user.id)

  async function handleUpdate(values: ProjectFormValues) {
    try {
      await updateProject.mutateAsync(values)
      showToast({ title: 'Project updated', variant: 'success' })
      setEditOpen(false)
    } catch (err) {
      showToast({
        title: 'Could not update project',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleDelete() {
    if (!id) return
    try {
      await deleteProject.mutateAsync(id)
      showToast({ title: 'Project deleted', variant: 'success' })
      navigate('/projects')
    } catch (err) {
      showToast({
        title: 'Could not delete project',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleCreateTask(values: TaskFormValues) {
    try {
      await createTask.mutateAsync(values)
      showToast({ title: 'Task created', variant: 'success' })
      setCreateTaskOpen(false)
    } catch (err) {
      showToast({
        title: 'Could not create task',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        description={project.description}
        actions={
          <div className="flex items-center gap-2">
            <ProjectStatusControl project={project} disabled={!canManage} />
            {canManage && (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                  Delete
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground shadow-soft">
        <span className="flex items-center gap-2">
          Owner <Avatar name={project.owner.name} size="sm" /> {project.owner.name}
        </span>
        <span className="h-4 w-px bg-border" aria-hidden="true" />
        <span>Start {formatDate(project.startDate)}</span>
        <span className="h-4 w-px bg-border" aria-hidden="true" />
        <span>Due {formatDate(project.dueDate)}</span>
      </div>

      <Tabs defaultValue="board">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="board">Board</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          {canManage && (
            <Button size="sm" onClick={() => setCreateTaskOpen(true)}>
              New Task
            </Button>
          )}
        </div>

        <TabsContent value="board">
          <TaskBoard tasks={tasksData?.data ?? []} />
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <TaskFilters
            value={filters}
            onChange={(update) => setFilters(update)}
            onClear={() =>
              setFilters({
                search: '',
                status: undefined,
                priority: undefined,
                assignee: undefined,
                dueDateFrom: undefined,
                dueDateTo: undefined,
                overdue: undefined,
              })
            }
          />
          <TaskList
            tasks={tasksData?.data ?? []}
            isLoading={false}
            isError={false}
            onRetry={() => void refetch()}
          />
        </TabsContent>

        <TabsContent value="members">
          <MemberManager project={project} canManage={canManage} />
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          {stats && (
            <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StaggerItem>
                <StatCard label="Total tasks" value={stats.totalTasks} />
              </StaggerItem>
              <StaggerItem>
                <StatCard label="Overdue" value={stats.overdueCount} />
              </StaggerItem>
              <StaggerItem>
                <StatCard label="Completion rate" value={`${stats.completionRate}%`} />
              </StaggerItem>
            </StaggerContainer>
          )}
        </TabsContent>

        <TabsContent value="activity">{id && <ProjectActivityFeed projectId={id} />}</TabsContent>
      </Tabs>

      <Modal open={editOpen} onOpenChange={setEditOpen} title="Edit project">
        <ProjectForm
          initialValues={project}
          onSubmit={handleUpdate}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete project"
        description={`This will also remove ${project.taskCount} task(s) in this project. This cannot be undone.`}
        variant="destructive"
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />

      <Modal open={createTaskOpen} onOpenChange={setCreateTaskOpen} title="New task" size="lg">
        {id && (
          <TaskForm
            projectId={id}
            memberIds={memberIds}
            onSubmit={handleCreateTask}
            onCancel={() => setCreateTaskOpen(false)}
            submitLabel="Create"
          />
        )}
      </Modal>
    </div>
  )
}
