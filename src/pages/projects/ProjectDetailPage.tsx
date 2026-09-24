import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Modal } from '@/components/common/Modal'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { CardSkeleton } from '@/components/common/Skeleton'
import { Avatar } from '@/components/common/Avatar'
import { StaggerContainer, StaggerItem } from '@/components/common/Stagger'
import { StatCard } from '@/components/dashboard/StatCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FormField } from '@/components/common/FormField'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { ProjectStatusControl } from '@/components/projects/ProjectStatusControl'
import { MemberManager } from '@/components/projects/MemberManager'
import { ProjectActivityFeed } from '@/components/projects/ProjectActivityFeed'
import { TaskBoard } from '@/components/tasks/TaskBoard'
import { TaskList } from '@/components/tasks/TaskList'
import { TaskFilters } from '@/components/tasks/TaskFilters'
import { SavedFiltersMenu } from '@/components/tasks/SavedFiltersMenu'
import { TaskForm } from '@/components/tasks/TaskForm'
import { SprintForm } from '@/components/sprints/SprintForm'
import { SprintLifecycleControls } from '@/components/sprints/SprintLifecycleControls'
import { SprintCapacityIndicator } from '@/components/sprints/SprintCapacityIndicator'
import { SprintHistoryList } from '@/components/sprints/SprintHistoryList'
import { BacklogBoard } from '@/components/sprints/BacklogBoard'
import { CalendarView } from '@/components/sprints/CalendarView'
import { SprintBurndownChart } from '@/components/sprints/SprintBurndownChart'
import { SprintVelocityChart } from '@/components/sprints/SprintVelocityChart'
import { EpicsList } from '@/components/tasks/EpicsList'
import { EpicRoadmapTimeline } from '@/components/projects/EpicRoadmapTimeline'
import { WorkflowSettingsForm } from '@/components/projects/WorkflowSettingsForm'
import { WorkflowCanvas } from '@/components/projects/WorkflowCanvas'
import { FieldsSettingsForm } from '@/components/projects/FieldsSettingsForm'
import { CustomFieldOverridesForm } from '@/components/projects/CustomFieldOverridesForm'
import { SlaPolicySettingsForm } from '@/components/projects/SlaPolicySettingsForm'
import { DependencyGraphView } from '@/components/projects/DependencyGraphView'
import { EpicProgressTable } from '@/components/projects/EpicProgressTable'
import { IssueTypesSettingsForm } from '@/components/projects/IssueTypesSettingsForm'
import { AutomationRulesForm } from '@/components/projects/AutomationRulesForm'
import { AutomationLogList } from '@/components/projects/AutomationLogList'
import { NotificationSchemeForm } from '@/components/projects/NotificationSchemeForm'
import { PermissionSchemeAssignment } from '@/components/projects/PermissionSchemeAssignment'
import {
  useProject,
  useProjectLabels,
  useProjectStats,
  useProjectTasks,
  useProjectWorkflow,
} from '@/hooks/queries/useProjects'
import { useWorkflowTemplates } from '@/hooks/queries/useWorkflowTemplates'
import { useActiveSprint, useSprints } from '@/hooks/queries/useSprints'
import { useDeleteProject, useUpdateProject } from '@/hooks/mutations/useProjectMutations'
import { useCreateTask } from '@/hooks/mutations/useTaskMutations'
import { useCreateSprint, useUpdateSprint } from '@/hooks/mutations/useSprintMutations'
import { useQueryParams } from '@/hooks/useQueryParams'
import { useAuth } from '@/hooks/useAuth'
import { useSocket } from '@/hooks/useSocket'
import { useToast } from '@/hooks/useToast'
import { formatDate } from '@/lib/date'
import { toApiError } from '@/lib/error'
import type { ProjectFormValues } from '@/schemas/project.schema'
import type { TaskFormValues } from '@/schemas/task.schema'
import type { SprintFormValues } from '@/schemas/sprint.schema'
import type { Sprint } from '@/types/sprint.types'
import { STANDARD_ISSUE_TYPES, type TaskListQuery } from '@/types/task.types'
import { resolveIssueTypes, standardIssueTypeNames } from '@/types/issue-type.types'
import type { Workflow } from '@/types/workflow.types'

/** The issue-type selector's sentinel value for "the project-wide default workflow" - Select
 * doesn't allow an empty-string item value, and `undefined` isn't a valid controlled value. */
const DEFAULT_WORKFLOW_OPTION = '__default__'

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { hasRole, user } = useAuth()
  const { joinProject, leaveProject } = useSocket()

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [createTaskOpen, setCreateTaskOpen] = useState(false)
  const [sprintModalOpen, setSprintModalOpen] = useState(false)
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null)
  // Tab selection shares this same useQueryParams call with the List tab's filters - see
  // ProjectsListPage for why two separate useQueryParams-backed hooks would silently discard
  // whichever one's URL update loses the race when their setters fire back-to-back. `tab` is
  // destructured out below so it never leaks into the task-list API queries that spread `filters`.
  const [state, setFilters] = useQueryParams({
    tab: 'board',
    search: '',
    status: undefined as string | undefined,
    priority: undefined as TaskListQuery['priority'],
    assignee: undefined as string | undefined,
    dueDateFrom: undefined as string | undefined,
    dueDateTo: undefined as string | undefined,
    overdue: undefined as boolean | undefined,
    issueType: undefined as string | undefined,
    // Board quick filter (BRD 6.1) - which epic's linked issues to show. Shared with List, same
    // as every other filter in this object.
    epicId: undefined as string | undefined,
  })
  const { tab, issueType: issueTypeFilter, epicId, ...filters } = state
  // Board-only, not persisted to the URL or shared with List - a pure display grouping (see
  // TaskBoard's own SwimlaneBy type), reset is harmless so it doesn't need to survive a reload.
  const [swimlaneBy, setSwimlaneBy] = useState<'none' | 'assignee' | 'priority' | 'epic'>('none')
  // Not persisted to the URL, unlike the rest of `filters` - useQueryParams is shared with several
  // pages and typed for scalar values only; these are string arrays.
  const [labelFilter, setLabelFilter] = useState<string[]>([])
  const [componentFilter, setComponentFilter] = useState<string[]>([])
  const [customFieldFilters, setCustomFieldFilters] = useState<
    Array<{ fieldId: string; value: string }>
  >([])

  const { data: project, isLoading, isError, error, refetch } = useProject(id)
  const { data: labelOptions } = useProjectLabels(id)
  // A project's own Standard-level type names (the BRD's "extensible" level) - falls back to the
  // 5 built-ins' Story/Task/Bug when the project hasn't customized its issue types. A user's
  // explicit type-filter narrows to just that one type; otherwise every Standard-level task shows,
  // exactly matching today's behavior for any project with no customization.
  const standardTypeNames = project ? standardIssueTypeNames(project) : STANDARD_ISSUE_TYPES
  const effectiveIssueTypes = issueTypeFilter ? [issueTypeFilter] : standardTypeNames
  // BRD 6.3's Kanban-vs-Scrum toggle - Kanban hides the Backlog/Sprint-board/Calendar tabs
  // (Board/List stay). Undefined (every project predating this feature) behaves as Scrum.
  const isKanban = project?.boardType === 'Kanban'
  const { data: tasksData } = useProjectTasks(id, {
    page: 1,
    limit: 100,
    issueType: effectiveIssueTypes,
    ...filters,
    parent: epicId,
    labels: labelFilter.length ? labelFilter : undefined,
    components: componentFilter.length ? componentFilter : undefined,
    customFieldFilters: customFieldFilters.length ? customFieldFilters : undefined,
  })
  const { data: stats } = useProjectStats(id)
  const { data: sprintsData } = useSprints(id, { page: 1, limit: 100 })
  const { data: activeSprint } = useActiveSprint(id)
  const { data: backlogData } = useProjectTasks(id, {
    page: 1,
    limit: 100,
    unassignedSprint: true,
    issueType: effectiveIssueTypes,
    sortBy: 'rank',
    sortOrder: 'asc',
  })
  const { data: sprintBoardData } = useProjectTasks(
    id,
    {
      page: 1,
      limit: 100,
      sprintId: activeSprint?.id,
      issueType: effectiveIssueTypes,
      assignee: filters.assignee,
      parent: epicId,
    },
    { enabled: !!activeSprint },
  )
  const { data: epicsData } = useProjectTasks(id, { page: 1, limit: 100, issueType: ['Epic'] })
  const { data: workflow } = useProjectWorkflow(id)

  // Workflow tab: an issue-type selector (Workflow Engine v2's per-issue-type workflows), a
  // Visual/List view toggle (defaults to List, today's exact experience), and an optional
  // "apply a template" action that only seeds the form's local draft - nothing is saved until
  // the form's own Save button is clicked.
  const [workflowIssueType, setWorkflowIssueType] = useState<string>(DEFAULT_WORKFLOW_OPTION)
  const [workflowView, setWorkflowView] = useState<'list' | 'visual'>('list')
  const [templateDraft, setTemplateDraft] = useState<Workflow | null>(null)
  const effectiveWorkflowIssueType =
    workflowIssueType === DEFAULT_WORKFLOW_OPTION ? undefined : workflowIssueType
  const { data: tabWorkflow } = useProjectWorkflow(id, effectiveWorkflowIssueType)
  const { data: workflowTemplates } = useWorkflowTemplates()

  function handleWorkflowIssueTypeChange(value: string) {
    setWorkflowIssueType(value)
    setTemplateDraft(null)
  }

  function applyWorkflowTemplate(templateId: string) {
    const template = workflowTemplates?.find((t) => t.id === templateId)
    if (!template) return
    setTemplateDraft(template.workflow)
    showToast({
      title: `Applied "${template.name}" - review and click Save to keep it`,
      variant: 'success',
    })
  }

  // Reports tab: a sprint selector for the Burndown chart (Velocity is always project-wide) -
  // defaults to the active sprint, falling back to the most recently started sprint if none is
  // active, but a user's own pick always wins once made.
  const [reportsSprintId, setReportsSprintId] = useState<string | undefined>(undefined)
  const mostRecentlyStartedSprint = (sprintsData?.data ?? [])
    .filter((s) => s.startedAt)
    .sort((a, b) => (b.startedAt! > a.startedAt! ? 1 : -1))[0]
  const effectiveReportsSprintId =
    reportsSprintId ?? activeSprint?.id ?? mostRecentlyStartedSprint?.id

  const updateProject = useUpdateProject(id ?? '')
  const deleteProject = useDeleteProject()
  const createTask = useCreateTask()
  const createSprint = useCreateSprint(id ?? '')
  const updateSprint = useUpdateSprint(id ?? '', editingSprint?.id ?? '')

  useEffect(() => {
    if (!id) return
    joinProject(id)
    return () => leaveProject(id)
  }, [id, joinProject, leaveProject])

  if (isLoading) {
    return <CardSkeleton />
  }

  if (isError || !project) {
    return <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
  }

  const canManage = hasRole('Admin') || (hasRole('Manager') && project.owner.id === user?.id)
  const memberIds = project.members.map((m) => m.user.id)
  const memberNameById = Object.fromEntries(
    [project.owner, ...project.members.map((m) => m.user)].map((u) => [u.id, u.name]),
  )
  // Per-project grants (see Phase 3's permission schemes) can only ever ADD capability beyond
  // canManage, never replace it - canManage still gates every project-administration action.
  const myGrant = project.members.find((m) => m.user.id === user?.id)?.permissions ?? null
  const canCreateTaskHere = canManage || !!myGrant?.canCreateTask
  const canManageSprintsHere = canManage || !!myGrant?.canManageSprints

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

  function openCreateSprint() {
    setEditingSprint(null)
    setSprintModalOpen(true)
  }

  function openEditSprint(sprint: Sprint) {
    setEditingSprint(sprint)
    setSprintModalOpen(true)
  }

  async function handleSubmitSprint(values: SprintFormValues) {
    try {
      if (editingSprint) {
        await updateSprint.mutateAsync(values)
        showToast({ title: 'Sprint updated', variant: 'success' })
      } else {
        await createSprint.mutateAsync(values)
        showToast({ title: 'Sprint created', variant: 'success' })
      }
      setSprintModalOpen(false)
    } catch (err) {
      showToast({
        title: 'Could not save sprint',
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

      <Tabs value={tab} onValueChange={(next) => setFilters({ tab: next })}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="board">Board</TabsTrigger>
            {!isKanban && (
              <>
                <TabsTrigger value="backlog">Backlog</TabsTrigger>
                <TabsTrigger value="sprint-board">Sprint Board</TabsTrigger>
                <TabsTrigger value="calendar">Calendar</TabsTrigger>
              </>
            )}
            <TabsTrigger value="epics">Epics</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
            <TabsTrigger value="fields">Fields</TabsTrigger>
            <TabsTrigger value="issue-types">Issue Types</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="sla">SLA</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
          </TabsList>
          {(canManageSprintsHere || canCreateTaskHere) && (
            <div className="flex shrink-0 items-center gap-2">
              {canManageSprintsHere && (
                <Button variant="outline" size="sm" onClick={openCreateSprint}>
                  New Sprint
                </Button>
              )}
              {canCreateTaskHere && (
                <Button size="sm" onClick={() => setCreateTaskOpen(true)}>
                  New Task
                </Button>
              )}
            </div>
          )}
        </div>

        <TabsContent value="board" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={filters.assignee === user?.id ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                setFilters({ assignee: filters.assignee === user?.id ? undefined : user?.id })
              }
            >
              My issues
            </Button>
            <Select
              value={epicId ?? '__all__'}
              onValueChange={(v) => setFilters({ epicId: v === '__all__' ? undefined : v })}
            >
              <SelectTrigger aria-label="Filter by epic" className="w-44">
                <SelectValue placeholder="All epics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All epics</SelectItem>
                {(epicsData?.data ?? []).map((epic) => (
                  <SelectItem key={epic.id} value={epic.id}>
                    {epic.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={swimlaneBy} onValueChange={(v) => setSwimlaneBy(v as typeof swimlaneBy)}>
              <SelectTrigger aria-label="Group into swimlanes" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No swimlanes</SelectItem>
                <SelectItem value="assignee">Swimlanes: Assignee</SelectItem>
                <SelectItem value="priority">Swimlanes: Priority</SelectItem>
                <SelectItem value="epic">Swimlanes: Epic</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <TaskBoard
            tasks={tasksData?.data ?? []}
            workflow={workflow}
            grant={myGrant}
            issueTypeDefinitions={resolveIssueTypes(project)}
            swimlaneBy={swimlaneBy}
          />
        </TabsContent>

        <TabsContent value="backlog" className="space-y-4">
          {(sprintsData?.data ?? [])
            .filter((s) => s.status !== 'Completed')
            .map((sprint) => (
              <div
                key={sprint.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3"
              >
                <div className="flex-1">
                  <p className="font-medium">{sprint.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}
                    {sprint.goal && ` · ${sprint.goal}`}
                  </p>
                  <SprintCapacityIndicator projectId={id ?? ''} sprint={sprint} />
                </div>
                <SprintLifecycleControls
                  sprint={sprint}
                  projectId={id ?? ''}
                  canManage={canManageSprintsHere}
                  onEdit={() => openEditSprint(sprint)}
                  plannedSprints={(sprintsData?.data ?? []).filter((s) => s.status === 'Planned')}
                />
              </div>
            ))}

          <BacklogBoard
            tasks={backlogData?.data ?? []}
            canManage={canManageSprintsHere}
            assignableSprints={(sprintsData?.data ?? []).filter(
              (s) => s.status === 'Planned' || s.status === 'Active',
            )}
          />
        </TabsContent>

        <TabsContent value="sprint-board" className="space-y-4">
          {activeSprint ? (
            <>
              <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3">
                <div className="flex-1">
                  <p className="font-medium">{activeSprint.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(activeSprint.startDate)} – {formatDate(activeSprint.endDate)}
                    {activeSprint.goal && ` · ${activeSprint.goal}`}
                  </p>
                  {(() => {
                    const currentIds = new Set((sprintBoardData?.data ?? []).map((t) => t.id))
                    const initialIds = new Set(activeSprint.initialTaskIds ?? [])
                    const added = [...currentIds].filter((tid) => !initialIds.has(tid)).length
                    const removed = [...initialIds].filter((tid) => !currentIds.has(tid)).length
                    return added > 0 || removed > 0 ? (
                      <p className="mt-1 text-xs font-medium text-amber-700">
                        Scope change since start: +{added} / −{removed}
                      </p>
                    ) : null
                  })()}
                </div>
                <SprintLifecycleControls
                  sprint={activeSprint}
                  projectId={id ?? ''}
                  canManage={canManageSprintsHere}
                  onEdit={() => openEditSprint(activeSprint)}
                  plannedSprints={(sprintsData?.data ?? []).filter((s) => s.status === 'Planned')}
                />
              </div>
              <TaskBoard
                tasks={sprintBoardData?.data ?? []}
                workflow={workflow}
                grant={myGrant}
                issueTypeDefinitions={resolveIssueTypes(project)}
                swimlaneBy={swimlaneBy}
              />
            </>
          ) : (
            <EmptyState
              title="No active sprint"
              description="Start a Planned sprint from the Backlog tab to see its board here."
            />
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarView sprints={sprintsData?.data ?? []} projectId={id ?? ''} />
        </TabsContent>

        <TabsContent value="epics" className="space-y-4">
          {id && <EpicRoadmapTimeline projectId={id} />}
          <EpicsList
            epics={epicsData?.data ?? []}
            issueTypeDefinitions={resolveIssueTypes(project)}
          />
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SavedFiltersMenu
              scope="project"
              projectId={id}
              memberNameById={memberNameById}
              currentQuery={{
                ...filters,
                labels: labelFilter,
                components: componentFilter,
                customFieldFilters,
              }}
              onApply={(query) => {
                const q = query as Partial<TaskListQuery>
                setLabelFilter(q.labels ?? [])
                setComponentFilter(q.components ?? [])
                setCustomFieldFilters(q.customFieldFilters ?? [])
                setFilters({
                  search: q.search ?? '',
                  status: q.status,
                  priority: q.priority,
                  assignee: q.assignee,
                  dueDateFrom: q.dueDateFrom,
                  dueDateTo: q.dueDateTo,
                  overdue: q.overdue,
                })
              }}
            />
          </div>
          <TaskFilters
            value={{
              ...filters,
              issueType: issueTypeFilter ? [issueTypeFilter] : undefined,
              labels: labelFilter,
              components: componentFilter,
              customFieldFilters,
            }}
            onChange={(update) => {
              if ('labels' in update) setLabelFilter(update.labels ?? [])
              if ('components' in update) setComponentFilter(update.components ?? [])
              if ('customFieldFilters' in update) {
                setCustomFieldFilters(update.customFieldFilters ?? [])
              }
              if ('issueType' in update) setFilters({ issueType: update.issueType?.[0] })
              const rest = { ...update }
              delete rest.labels
              delete rest.components
              delete rest.customFieldFilters
              delete rest.issueType
              if (Object.keys(rest).length) setFilters(rest as Partial<typeof filters>)
            }}
            onClear={() => {
              setLabelFilter([])
              setComponentFilter([])
              setCustomFieldFilters([])
              setFilters({
                search: '',
                status: undefined,
                priority: undefined,
                assignee: undefined,
                dueDateFrom: undefined,
                dueDateTo: undefined,
                overdue: undefined,
                issueType: undefined,
              })
            }}
            statuses={workflow?.statuses}
            labelOptions={labelOptions}
            componentOptions={project?.components}
            customFieldOptions={project?.customFields.filter(
              (f) => f.type === 'Text' || f.type === 'Dropdown',
            )}
            issueTypeOptions={resolveIssueTypes(project)}
          />
          <TaskList
            tasks={tasksData?.data ?? []}
            isLoading={false}
            isError={false}
            onRetry={() => void refetch()}
            issueTypeDefinitions={resolveIssueTypes(project)}
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

        <TabsContent value="reports" className="space-y-4">
          {id && (
            <>
              <FormField label="Burndown for" htmlFor="reports-sprint-select">
                <Select
                  value={effectiveReportsSprintId ?? ''}
                  onValueChange={setReportsSprintId}
                  disabled={(sprintsData?.data ?? []).filter((s) => s.startedAt).length === 0}
                >
                  <SelectTrigger id="reports-sprint-select" className="w-64">
                    <SelectValue placeholder="No started sprints yet" />
                  </SelectTrigger>
                  <SelectContent>
                    {(sprintsData?.data ?? [])
                      .filter((s) => s.startedAt)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </FormField>
              <SprintBurndownChart projectId={id} sprintId={effectiveReportsSprintId} />
              <SprintVelocityChart projectId={id} />
              <EpicProgressTable projectId={id} />
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Sprint history</h3>
                <SprintHistoryList projectId={id} />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="activity">{id && <ProjectActivityFeed projectId={id} />}</TabsContent>

        <TabsContent value="workflow">
          {id && tabWorkflow ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-end gap-3">
                  <FormField label="Issue type" htmlFor="workflow-issue-type-select">
                    <Select value={workflowIssueType} onValueChange={handleWorkflowIssueTypeChange}>
                      <SelectTrigger id="workflow-issue-type-select" className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={DEFAULT_WORKFLOW_OPTION}>
                          Default (project-wide)
                        </SelectItem>
                        {resolveIssueTypes(project).map((t) => (
                          <SelectItem key={t.name} value={t.name}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  {canManage && workflowTemplates && workflowTemplates.length > 0 && (
                    <FormField label="Use a template" htmlFor="workflow-template-select">
                      <Select value="" onValueChange={applyWorkflowTemplate}>
                        <SelectTrigger id="workflow-template-select" className="w-48">
                          <SelectValue placeholder="Choose a template…" />
                        </SelectTrigger>
                        <SelectContent>
                          {workflowTemplates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  )}
                </div>
                <div className="flex items-center gap-1 rounded-md border p-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={workflowView === 'list' ? 'default' : 'ghost'}
                    onClick={() => setWorkflowView('list')}
                  >
                    List
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={workflowView === 'visual' ? 'default' : 'ghost'}
                    onClick={() => setWorkflowView('visual')}
                  >
                    Visual
                  </Button>
                </div>
              </div>

              {workflowView === 'list' ? (
                <WorkflowSettingsForm
                  key={`${workflowIssueType}-${templateDraft ? 'template' : 'live'}-list`}
                  projectId={id}
                  workflow={templateDraft ?? tabWorkflow}
                  canManage={canManage}
                  issueType={effectiveWorkflowIssueType}
                  customFields={project?.customFields}
                />
              ) : (
                <WorkflowCanvas
                  key={`${workflowIssueType}-${templateDraft ? 'template' : 'live'}-visual`}
                  projectId={id}
                  workflow={templateDraft ?? tabWorkflow}
                  canManage={canManage}
                  issueType={effectiveWorkflowIssueType}
                  automationRules={project?.automationRules}
                />
              )}
            </div>
          ) : (
            <CardSkeleton />
          )}
        </TabsContent>

        <TabsContent value="fields">
          <FieldsSettingsForm projectId={id ?? ''} project={project} canManage={canManage} />
          <CustomFieldOverridesForm projectId={id ?? ''} project={project} canManage={canManage} />
        </TabsContent>

        <TabsContent value="issue-types">
          <IssueTypesSettingsForm projectId={id ?? ''} project={project} canManage={canManage} />
        </TabsContent>

        <TabsContent value="automation" className="space-y-6">
          <AutomationRulesForm projectId={id ?? ''} project={project} canManage={canManage} />
          {(hasRole('Admin') || hasRole('Manager')) && (
            <div className="space-y-2">
              <h3 className="font-medium">Automation activity log</h3>
              <AutomationLogList projectId={id ?? ''} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationSchemeForm
            projectId={id ?? ''}
            notificationScheme={project.notificationScheme}
            canManage={canManage}
          />
        </TabsContent>

        <TabsContent value="dependencies">
          <DependencyGraphView projectId={id ?? ''} />
        </TabsContent>

        <TabsContent value="sla">
          <SlaPolicySettingsForm projectId={id ?? ''} canManage={canManage} />
        </TabsContent>

        <TabsContent value="permissions">
          <PermissionSchemeAssignment
            projectId={id ?? ''}
            permissionSchemeId={project.permissionSchemeId}
            canManage={canManage}
          />
        </TabsContent>
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

      <Modal
        open={sprintModalOpen}
        onOpenChange={setSprintModalOpen}
        title={editingSprint ? 'Edit sprint' : 'New sprint'}
      >
        <SprintForm
          initialValues={editingSprint ?? undefined}
          onSubmit={handleSubmitSprint}
          onCancel={() => setSprintModalOpen(false)}
          submitLabel={editingSprint ? 'Save' : 'Create'}
        />
      </Modal>
    </div>
  )
}
