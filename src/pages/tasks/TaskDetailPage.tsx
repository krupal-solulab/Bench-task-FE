import { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Modal } from '@/components/common/Modal'
import { ErrorState } from '@/components/common/ErrorState'
import { CardSkeleton } from '@/components/common/Skeleton'
import { Avatar } from '@/components/common/Avatar'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { IssueTypeBadge } from '@/components/common/IssueTypeBadge'
import { OverdueBadge } from '@/components/common/OverdueBadge'
import { UserSelect } from '@/components/common/UserSelect'
import { TaskStatusControl } from '@/components/tasks/TaskStatusControl'
import { TaskForm } from '@/components/tasks/TaskForm'
import { TaskActivityFeed } from '@/components/tasks/TaskActivityFeed'
import { AttachmentList } from '@/components/tasks/AttachmentList'
import { SubtaskChecklist } from '@/components/tasks/SubtaskChecklist'
import { IssueLinksSection } from '@/components/tasks/IssueLinksSection'
import { WorkLogSection } from '@/components/worklogs/WorkLogSection'
import { resolveIssueTypes, standardIssueTypeNames } from '@/types/issue-type.types'
import { CommentList } from '@/components/comments/CommentList'
import { useTask } from '@/hooks/queries/useTasks'
import {
  useEffectiveCustomFields,
  useProject,
  useProjectWorkflow,
} from '@/hooks/queries/useProjects'
import type { CustomFieldDefinition } from '@/types/project.types'
import {
  useDeleteTask,
  useUpdateTask,
  useUpdateTaskAssignee,
} from '@/hooks/mutations/useTaskMutations'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { useSocket } from '@/hooks/useSocket'
import { useToast } from '@/hooks/useToast'
import { formatDate, formatDateTime } from '@/lib/date'
import { toApiError } from '@/lib/error'
import type { TaskFormValues } from '@/schemas/task.schema'

function formatCustomFieldValue(
  field: CustomFieldDefinition,
  value: unknown,
  userNameById: Map<string, string>,
): string {
  if (value === null || value === undefined || value === '') return '—'
  if (field.type === 'Checkbox') return value ? 'Yes' : 'No'
  if (field.type === 'MultiSelect') {
    return Array.isArray(value) && value.length > 0 ? value.join(', ') : '—'
  }
  if (field.type === 'UserPicker') {
    // Falls back to the raw id for a member who's since left the project, rather than crashing.
    return userNameById.get(String(value)) ?? String(value)
  }
  return String(value)
}

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { user } = useAuth()
  const { can, canEditTaskField, canCreateTaskInProject } = usePermissions()
  const { joinProject, leaveProject } = useSocket()

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: task, isLoading, isError, error, refetch } = useTask(id)
  const { data: project } = useProject(task?.project.id)
  const { data: workflow } = useProjectWorkflow(task?.project.id)
  const { data: effectiveCustomFields } = useEffectiveCustomFields(
    task?.project.id,
    task?.issueType,
  )

  const updateTask = useUpdateTask(id ?? '')
  const updateAssignee = useUpdateTaskAssignee(id ?? '')
  const deleteTask = useDeleteTask()

  const taskProjectId = task?.project.id
  useEffect(() => {
    if (!taskProjectId) return
    joinProject(taskProjectId)
    return () => leaveProject(taskProjectId)
  }, [taskProjectId, joinProject, leaveProject])

  if (isLoading) return <CardSkeleton />
  if (isError || !task) {
    return <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
  }

  const isAssignee = task.assignee?.id === user?.id
  // Per-project grants (see Phase 3's permission schemes) let these diverge for a Developer -
  // Admin/Manager are unaffected since `can(role, 'task:editAny')` already covers every case.
  const myGrant = project?.members.find((m) => m.user.id === user?.id)?.permissions ?? null
  const userNameById = new Map(
    project
      ? [project.owner, ...project.members.map((m) => m.user)].map((u) => [u.id, u.name])
      : [],
  )
  const customFields = effectiveCustomFields ?? project?.customFields ?? []
  const canEditOther = canEditTaskField('other', isAssignee, myGrant)
  const canDeleteTask = canEditTaskField('delete', isAssignee, myGrant)
  const canEditStatus = canEditTaskField('status', isAssignee, myGrant)
  const canReassign = can('task:editAny')
  const canCreateSubtask = canCreateTaskInProject(myGrant)

  async function handleUpdate(values: TaskFormValues) {
    if (!id) return
    try {
      await updateTask.mutateAsync({
        title: values.title,
        description: values.description,
        priority: values.priority,
        dueDate: values.dueDate,
        storyPoints: values.storyPoints,
        originalEstimateHours: values.originalEstimateHours,
        labels: values.labels,
        components: values.components,
        fixVersions: values.fixVersions,
        affectsVersions: values.affectsVersions,
        customFieldValues: values.customFieldValues,
        securityLevel: values.securityLevel,
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
            <TaskStatusControl task={task} canEdit={canEditStatus} workflow={workflow} />
            {canEditOther && (
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
            )}
            {canDeleteTask && (
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
                  Type
                </dt>
                <dd className="mt-1 flex items-center gap-1.5">
                  <IssueTypeBadge
                    issueType={task.issueType}
                    definitions={project ? resolveIssueTypes(project) : undefined}
                  />
                  {task.issueKey && (
                    <span className="font-mono text-xs text-muted-foreground">{task.issueKey}</span>
                  )}
                </dd>
              </div>
              {task.parent && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {task.issueType === 'Sub-task' ? 'Parent' : 'Epic'}
                  </dt>
                  <dd className="mt-1">
                    <Link
                      to={`/tasks/${task.parent.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {task.parent.issueKey ?? task.parent.title}
                    </Link>
                  </dd>
                </div>
              )}
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
                  <OverdueBadge
                    dueDate={task.dueDate}
                    status={task.status}
                    isDone={task.statusCategory === 'Done'}
                  />
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
              {customFields.map((field) => (
                <div key={field.id}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {field.name}
                  </dt>
                  <dd className="mt-1">
                    {formatCustomFieldValue(field, task.customFieldValues[field.id], userNameById)}
                  </dd>
                </div>
              ))}
            </dl>

            {(task.labels.length > 0 ||
              task.components.length > 0 ||
              task.fixVersions.length > 0 ||
              task.affectsVersions.length > 0) && (
              <div className="mt-5 flex flex-wrap gap-4 border-t pt-4">
                {task.fixVersions.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Fix Version
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {task.fixVersions.map((release) => (
                        <span
                          key={release.id}
                          className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                        >
                          {release.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {task.affectsVersions.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Affects Version
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {task.affectsVersions.map((release) => (
                        <span
                          key={release.id}
                          className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                        >
                          {release.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {task.labels.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Labels
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {task.labels.map((label) => (
                        <span
                          key={label}
                          className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {task.components.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Components
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {task.components.map((component) => (
                        <span
                          key={component}
                          className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                        >
                          {component}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {task.securityLevel && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Security level
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      <Lock className="h-3 w-3" /> {task.securityLevel}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 max-w-xs space-y-1.5 border-t pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Assignee
              </p>
              {canReassign ? (
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

          {standardIssueTypeNames(project ?? {}).includes(task.issueType) && (
            <SubtaskChecklist
              parentTaskId={task.id}
              projectId={task.project.id}
              canManage={canCreateSubtask}
            />
          )}

          <IssueLinksSection taskId={task.id} canManage={canEditOther} />

          <WorkLogSection taskId={task.id} />

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
