import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Modal } from '@/components/common/Modal'
import { ErrorState } from '@/components/common/ErrorState'
import { CardSkeleton } from '@/components/common/Skeleton'
import { Avatar } from '@/components/common/Avatar'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { OverdueBadge } from '@/components/common/OverdueBadge'
import { UserSelect } from '@/components/common/UserSelect'
import { TaskStatusControl } from '@/components/tasks/TaskStatusControl'
import { TaskForm } from '@/components/tasks/TaskForm'
import { TaskActivityFeed } from '@/components/tasks/TaskActivityFeed'
import { AttachmentList } from '@/components/tasks/AttachmentList'
import { CommentList } from '@/components/comments/CommentList'
import { useTask } from '@/hooks/queries/useTasks'
import { useProject } from '@/hooks/queries/useProjects'
import {
  useDeleteTask,
  useUpdateTask,
  useUpdateTaskAssignee,
} from '@/hooks/mutations/useTaskMutations'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { useToast } from '@/hooks/useToast'
import { formatDate, formatDateTime } from '@/lib/date'
import { toApiError } from '@/lib/error'
import type { TaskFormValues } from '@/schemas/task.schema'

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { user } = useAuth()
  const { canEditTaskField } = usePermissions()

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: task, isLoading, isError, error, refetch } = useTask(id)
  const { data: project } = useProject(task?.project.id)

  const updateTask = useUpdateTask(id ?? '')
  const updateAssignee = useUpdateTaskAssignee(id ?? '')
  const deleteTask = useDeleteTask()

  if (isLoading) return <CardSkeleton />
  if (isError || !task) {
    return <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
  }

  const isAssignee = task.assignee?.id === user?.id
  const canEditOther = canEditTaskField('other', isAssignee)
  const canEditStatus = canEditTaskField('status', isAssignee)
  const canDelete = canEditOther

  async function handleUpdate(values: TaskFormValues) {
    if (!id) return
    try {
      await updateTask.mutateAsync({
        title: values.title,
        description: values.description,
        priority: values.priority,
        dueDate: values.dueDate,
      })
      showToast({ title: 'Task updated', variant: 'success' })
      setEditOpen(false)
    } catch (err) {
      showToast({
        title: 'Could not update task',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleDelete() {
    if (!id || !task) return
    try {
      await deleteTask.mutateAsync(id)
      showToast({ title: 'Task deleted', variant: 'success' })
      navigate(`/projects/${task.project.id}`)
    } catch (err) {
      showToast({
        title: 'Could not delete task',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleReassign(assignee: string | null) {
    try {
      await updateAssignee.mutateAsync({ assignee })
      showToast({ title: 'Assignee updated', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not reassign task',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={task.title}
        description={task.description || undefined}
        actions={
          <div className="flex items-center gap-2">
            <TaskStatusControl task={task} canEdit={canEditStatus} />
            {canEditOther && (
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
            )}
            {canDelete && (
              <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                Delete
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border bg-card p-5 shadow-soft">
            <dl className="grid grid-cols-2 gap-5 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Project
                </dt>
                <dd className="mt-1">
                  <Link
                    to={`/projects/${task.project.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {task.project.name}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Priority
                </dt>
                <dd className="mt-1">
                  <PriorityBadge priority={task.priority} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Due date
                </dt>
                <dd className="mt-1 flex items-center gap-1">
                  {formatDate(task.dueDate)}
                  <OverdueBadge dueDate={task.dueDate} status={task.status} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Created by
                </dt>
                <dd className="mt-1">{task.createdBy.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Created
                </dt>
                <dd className="mt-1">{formatDateTime(task.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Updated
                </dt>
                <dd className="mt-1">{formatDateTime(task.updatedAt)}</dd>
              </div>
            </dl>

            <div className="mt-5 max-w-xs space-y-1.5 border-t pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Assignee
              </p>
              {canEditOther ? (
                <UserSelect
                  value={task.assignee?.id ?? null}
                  onChange={handleReassign}
                  memberIds={project?.members.map((m) => m.user.id)}
                />
              ) : (
                <div className="flex items-center gap-2">
                  {task.assignee ? (
                    <>
                      <Avatar name={task.assignee.name} size="sm" /> {task.assignee.name}
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Unassigned</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <TaskActivityFeed taskId={task.id} />

          <AttachmentList taskId={task.id} />
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-soft">
          <CommentList taskId={task.id} />
        </div>
      </div>

      <Modal open={editOpen} onOpenChange={setEditOpen} title="Edit task" size="lg">
        <TaskForm
          projectId={task.project.id}
          memberIds={project?.members.map((m) => m.user.id)}
          initialValues={task}
          onSubmit={handleUpdate}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete task"
        description="This cannot be undone."
        variant="destructive"
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  )
}
