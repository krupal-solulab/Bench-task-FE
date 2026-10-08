import { useEffect, useState, type ReactNode } from 'react'
import { Check, Link2, Lock, Maximize2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
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
import { RiskBadge, RiskReasons } from '@/components/tasks/RiskBadge'
import { UserSelect } from '@/components/common/UserSelect'
import { TaskStatusControl } from '@/components/tasks/TaskStatusControl'
import { TaskApprovalActions } from '@/components/tasks/TaskApprovalActions'
import { TransitionPreviewButton } from '@/components/tasks/TransitionPreviewButton'
import { WatchVoteButtons } from '@/components/tasks/WatchVoteButtons'
import { SnoozeNotificationsControl } from '@/components/tasks/SnoozeNotificationsControl'
import { TaskForm } from '@/components/tasks/TaskForm'
import { TaskActivityFeed } from '@/components/tasks/TaskActivityFeed'
import { AttachmentList } from '@/components/tasks/AttachmentList'
import { SubtaskChecklist } from '@/components/tasks/SubtaskChecklist'
import { IssueLinksSection } from '@/components/tasks/IssueLinksSection'
import { ExternalReferencesSection } from '@/components/tasks/ExternalReferencesSection'
import { TaskSummaryPanel } from '@/components/tasks/TaskSummaryPanel'
import { WorkLogSection } from '@/components/worklogs/WorkLogSection'
import { resolveIssueTypes, standardIssueTypeNames } from '@/types/issue-type.types'
import { CommentList } from '@/components/comments/CommentList'
import { useTask } from '@/hooks/queries/useTasks'
import {
  useEffectiveCustomFields,
  useProject,
  useProjectWorkflow,
  useProjects,
} from '@/hooks/queries/useProjects'
import type { CustomFieldDefinition, Project } from '@/types/project.types'
import type { Task } from '@/types/task.types'
import type { Workflow } from '@/types/workflow.types'
import {
  useDeleteTask,
  useMoveTaskProject,
  useUpdateTask,
  useUpdateTaskAssignee,
} from '@/hooks/mutations/useTaskMutations'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { useSocket } from '@/hooks/useSocket'
import { addRecentlyViewed } from '@/hooks/useRecentlyViewed'
import { useToast } from '@/hooks/useToast'
import { formatDate, formatDateTime } from '@/lib/date'
import { effectiveMemberGrant } from '@/lib/roles'
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

export interface TaskDetailViewProps {
  taskId: string | undefined
  /** 'page': the full /tasks/:id page. 'panel': the Jira-style quick view opened from a
   * board card (header bar, main column + Details sidebar). */
  layout?: 'page' | 'panel'
  /** After a delete - the page goes back to the project; a panel just closes. */
  onDeleted?: () => void
}

/** Everything about one task - data, permissions, actions and their dialogs - shared by the full
 * task page and the board's quick-view popup, so the two can never drift apart. */
export function TaskDetailView({ taskId: id, layout = 'page', onDeleted }: TaskDetailViewProps) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { user, hasRole } = useAuth()
  const { can, canEditTaskField, canCreateTaskInProject } = usePermissions()
  const { joinProject, leaveProject } = useSocket()

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [moveProjectOpen, setMoveProjectOpen] = useState(false)
  const [moveTargetProjectId, setMoveTargetProjectId] = useState('')

  const { data: task, isLoading, isError, error, refetch } = useTask(id)

  useEffect(() => {
    if (task) {
      addRecentlyViewed({
        id: task.id,
        type: 'task',
        label: task.issueKey ? `${task.issueKey} ${task.title}` : task.title,
        path: `/tasks/${task.id}`,
      })
    }
  }, [task])

  const { data: project } = useProject(task?.project.id)
  const { data: workflow } = useProjectWorkflow(task?.project.id)
  const { data: effectiveCustomFields } = useEffectiveCustomFields(
    task?.project.id,
    task?.issueType,
  )

  const updateTask = useUpdateTask(id ?? '')
  const updateAssignee = useUpdateTaskAssignee(id ?? '')
  const deleteTask = useDeleteTask()
  const moveProject = useMoveTaskProject()
  const { data: projectsData } = useProjects({ limit: 100, sortBy: 'name', sortOrder: 'asc' })

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
  // Per-project grant plus the custom role permissions (QA, DevOps, ...), as the API enforces.
  const myGrant = effectiveMemberGrant(project, user)
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
  // Module 5 gap-closure: moving a task between projects needs the stricter assertUserCanManage
  // (Admin-in-org, or the Manager who owns the project) - the same check ProjectDetailPage's own
  // canManage uses, deliberately NOT the grant-extensible check canEditOther/canDeleteTask use.
  const canManageProject =
    !!project &&
    (hasRole('Admin') ||
      (hasRole('Manager') && project.owner.id === user?.id) ||
      !!myGrant?.canManageProject)
  const otherProjects = (projectsData?.data ?? []).filter((p) => p.id !== task.project.id)

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
      if (onDeleted) onDeleted()
      else navigate(`/projects/${task.project.id}`)
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

  async function handleMoveProject() {
    if (!id || !moveTargetProjectId) return
    try {
      await moveProject.mutateAsync({ id, targetProjectId: moveTargetProjectId })
      showToast({ title: 'Task moved to the new project', variant: 'success' })
      setMoveProjectOpen(false)
      setMoveTargetProjectId('')
    } catch (err) {
      showToast({
        title: 'Could not move task',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  const dialogs = (
    <>
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

      <Modal
        open={moveProjectOpen}
        onOpenChange={setMoveProjectOpen}
        title="Move to project"
        description="The task's sprint, components, fix/affects versions, custom fields, and security level will be cleared, and its status reset to the destination workflow's initial status - none of those have guaranteed meaning in the destination project."
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setMoveProjectOpen(false)}
              disabled={moveProject.isPending}
            >
              Cancel
            </Button>
            <Button
              loading={moveProject.isPending}
              disabled={!moveTargetProjectId}
              onClick={() => void handleMoveProject()}
            >
              Move
            </Button>
          </>
        }
      >
        <Select value={moveTargetProjectId} onValueChange={setMoveTargetProjectId}>
          <SelectTrigger aria-label="Target project">
            <SelectValue placeholder="Select a project…" />
          </SelectTrigger>
          <SelectContent>
            {otherProjects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Modal>
    </>
  )

  if (layout === 'panel') {
    return (
      <TaskQuickViewLayout
        task={task}
        project={project}
        workflow={workflow}
        customFields={customFields}
        userNameById={userNameById}
        canEditStatus={canEditStatus}
        canEditOther={canEditOther}
        canDeleteTask={canDeleteTask}
        canReassign={canReassign}
        canCreateSubtask={canCreateSubtask}
        canMove={canManageProject && otherProjects.length > 0}
        currentUserId={user?.id}
        onEdit={() => setEditOpen(true)}
        onMove={() => setMoveProjectOpen(true)}
        onDelete={() => setDeleteOpen(true)}
        onReassign={handleReassign}
        dialogs={dialogs}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={task.title}
        description={task.description || undefined}
        actionsBelow
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <TaskStatusControl task={task} canEdit={canEditStatus} workflow={workflow} />
            <TaskApprovalActions task={task} />
            <TransitionPreviewButton taskId={task.id} />
            <WatchVoteButtons task={task} />
            <SnoozeNotificationsControl taskId={task.id} />
            {canEditOther && (
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
            )}
            {canManageProject && otherProjects.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setMoveProjectOpen(true)}>
                Move to project
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
                  <RiskBadge taskId={task.id} />
                </dd>
                <RiskReasons taskId={task.id} />
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
          <ExternalReferencesSection task={task} />
          <TaskSummaryPanel taskId={task.id} />

          <WorkLogSection taskId={task.id} />

          <TaskActivityFeed
            taskId={task.id}
            customFieldNames={Object.fromEntries(
              (project?.customFields ?? []).map((f) => [f.id, f.name]),
            )}
          />

          <AttachmentList taskId={task.id} />
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-soft">
          <CommentList taskId={task.id} />
        </div>
      </div>

      {dialogs}
    </div>
  )
}

interface TaskQuickViewLayoutProps {
  task: Task
  project: Project | undefined
  workflow: Workflow | undefined
  customFields: CustomFieldDefinition[]
  userNameById: Map<string, string>
  canEditStatus: boolean
  canEditOther: boolean
  canDeleteTask: boolean
  canReassign: boolean
  canCreateSubtask: boolean
  canMove: boolean
  currentUserId: string | undefined
  onEdit: () => void
  onMove: () => void
  onDelete: () => void
  onReassign: (assignee: string | null) => Promise<void>
  dialogs: ReactNode
}

/** Jira-style issue quick view: a header bar (breadcrumb + actions), the issue itself on the left
 * and a Details sidebar on the right, each scrolling on its own inside the popup. */
function TaskQuickViewLayout({
  task,
  project,
  workflow,
  customFields,
  userNameById,
  canEditStatus,
  canEditOther,
  canDeleteTask,
  canReassign,
  canCreateSubtask,
  canMove,
  currentUserId,
  onEdit,
  onMove,
  onDelete,
  onReassign,
  dialogs,
}: TaskQuickViewLayoutProps) {
  const [copied, setCopied] = useState(false)
  const fullPagePath = `/tasks/${task.id}`

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${fullPagePath}`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard blocked - "Open full page" still gives the link.
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 border-b px-5 py-3 pr-14">
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
          <Link
            to={`/projects/${task.project.id}`}
            className="truncate text-muted-foreground hover:text-foreground hover:underline"
          >
            {task.project.name}
          </Link>
          <span className="text-muted-foreground">/</span>
          <IssueTypeBadge
            issueType={task.issueType}
            definitions={project ? resolveIssueTypes(project) : undefined}
          />
          {task.issueKey && (
            <span className="font-mono text-xs text-muted-foreground">{task.issueKey}</span>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <WatchVoteButtons task={task} />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={copied ? 'Link copied' : 'Copy link'}
            title="Copy link"
            onClick={() => void copyLink()}
          >
            {copied ? <Check /> : <Link2 />}
          </Button>
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link to={fullPagePath} aria-label="Open full page" title="Open full page">
              <Maximize2 />
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_340px] lg:overflow-hidden">
        {/* Main column */}
        <div className="min-h-0 space-y-5 px-6 py-5 scrollbar-thin lg:overflow-y-auto">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold leading-tight tracking-tight">{task.title}</h2>
            {(canEditOther || canMove || canDeleteTask) && (
              <div className="flex flex-wrap gap-2">
                {canEditOther && (
                  <Button variant="outline" size="sm" onClick={onEdit}>
                    Edit
                  </Button>
                )}
                {canMove && (
                  <Button variant="outline" size="sm" onClick={onMove}>
                    Move to project
                  </Button>
                )}
                {canDeleteTask && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={onDelete}
                  >
                    Delete
                  </Button>
                )}
              </div>
            )}
          </div>

          <section className="space-y-1.5">
            <h3 className="text-sm font-semibold">Description</h3>
            {task.description ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{task.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No description{canEditOther ? ' - use Edit to add one.' : '.'}
              </p>
            )}
          </section>

          {standardIssueTypeNames(project ?? {}).includes(task.issueType) && (
            <SubtaskChecklist
              parentTaskId={task.id}
              projectId={task.project.id}
              canManage={canCreateSubtask}
            />
          )}
          <IssueLinksSection taskId={task.id} canManage={canEditOther} />
          <AttachmentList taskId={task.id} />
          <ExternalReferencesSection task={task} />
          <TaskSummaryPanel taskId={task.id} />
          <WorkLogSection taskId={task.id} />
          <div className="rounded-xl border bg-card p-5 shadow-soft">
            <CommentList taskId={task.id} />
          </div>
          <TaskActivityFeed
            taskId={task.id}
            customFieldNames={Object.fromEntries(
              (project?.customFields ?? []).map((f) => [f.id, f.name]),
            )}
          />
        </div>

        {/* Details sidebar */}
        <aside className="min-h-0 space-y-4 border-t bg-muted/20 px-5 py-5 scrollbar-thin lg:overflow-y-auto lg:border-l lg:border-t-0">
          <div className="flex flex-wrap items-center gap-2">
            <TaskStatusControl task={task} canEdit={canEditStatus} workflow={workflow} />
            <TaskApprovalActions task={task} />
            <TransitionPreviewButton taskId={task.id} />
            <SnoozeNotificationsControl taskId={task.id} />
          </div>

          <section className="rounded-xl border bg-card shadow-soft">
            <h3 className="border-b px-4 py-3 text-sm font-semibold">Details</h3>
            <dl className="space-y-3.5 px-4 py-4 text-sm">
              <DetailRow label="Assignee">
                {canReassign ? (
                  <div className="space-y-1">
                    <UserSelect
                      value={task.assignee?.id ?? null}
                      onChange={(v) => void onReassign(v)}
                      memberIds={project?.members.map((m) => m.user.id)}
                    />
                    {currentUserId && task.assignee?.id !== currentUserId && (
                      <button
                        type="button"
                        className="text-xs font-medium text-primary hover:underline"
                        onClick={() => void onReassign(currentUserId)}
                      >
                        Assign to me
                      </button>
                    )}
                  </div>
                ) : task.assignee ? (
                  <span className="flex items-center gap-2">
                    <Avatar name={task.assignee.name} size="sm" /> {task.assignee.name}
                  </span>
                ) : (
                  <Muted>Unassigned</Muted>
                )}
              </DetailRow>
              <DetailRow label="Reporter">
                <span className="flex items-center gap-2">
                  <Avatar name={task.createdBy.name} size="sm" /> {task.createdBy.name}
                </span>
              </DetailRow>
              <DetailRow label="Priority">
                <PriorityBadge priority={task.priority} />
              </DetailRow>
              {task.parent && (
                <DetailRow label={task.issueType === 'Sub-task' ? 'Parent' : 'Epic'}>
                  <Link
                    to={`/tasks/${task.parent.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {task.parent.issueKey ?? task.parent.title}
                  </Link>
                </DetailRow>
              )}
              <DetailRow label="Due date">
                <span className="flex flex-wrap items-center gap-1">
                  {task.dueDate ? formatDate(task.dueDate) : <Muted>None</Muted>}
                  <OverdueBadge
                    dueDate={task.dueDate}
                    status={task.status}
                    isDone={task.statusCategory === 'Done'}
                  />
                  <RiskBadge taskId={task.id} />
                </span>
              </DetailRow>
              {task.storyPoints !== null && (
                <DetailRow label="Story points">{task.storyPoints}</DetailRow>
              )}
              <DetailRow label="Labels">
                <Chips values={task.labels} />
              </DetailRow>
              {task.components.length > 0 && (
                <DetailRow label="Components">
                  <Chips values={task.components} />
                </DetailRow>
              )}
              <DetailRow label="Fix versions">
                <Chips values={task.fixVersions.map((r) => r.name)} />
              </DetailRow>
              {task.affectsVersions.length > 0 && (
                <DetailRow label="Affects versions">
                  <Chips values={task.affectsVersions.map((r) => r.name)} />
                </DetailRow>
              )}
              {task.securityLevel && (
                <DetailRow label="Security">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                    <Lock className="h-3 w-3" /> {task.securityLevel}
                  </span>
                </DetailRow>
              )}
              {customFields.map((field) => (
                <DetailRow key={field.id} label={field.name}>
                  {formatCustomFieldValue(field, task.customFieldValues[field.id], userNameById)}
                </DetailRow>
              ))}
            </dl>
            <div className="px-4 pb-3">
              <RiskReasons taskId={task.id} />
            </div>
          </section>

          <p className="px-1 text-xs text-muted-foreground">
            <span className="block">Created {formatDateTime(task.createdAt)}</span>
            <span className="block">Updated {formatDateTime(task.updatedAt)}</span>
          </p>
        </aside>
      </div>
      {dialogs}
    </div>
  )
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] items-start gap-3">
      <dt className="pt-0.5 text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  )
}

function Muted({ children }: { children: ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>
}

function Chips({ values }: { values: string[] }) {
  if (values.length === 0) return <Muted>None</Muted>
  return (
    <span className="flex flex-wrap gap-1.5">
      {values.map((v) => (
        <span
          key={v}
          className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
        >
          {v}
        </span>
      ))}
    </span>
  )
}
