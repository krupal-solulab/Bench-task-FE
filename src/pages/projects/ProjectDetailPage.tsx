import { useEffect, useState } from 'react'
import { Archive, X } from 'lucide-react'
import { AtRiskIssuesCard } from '@/components/projects/AtRiskIssuesCard'
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
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { OverflowTabsList, type OverflowTab } from '@/components/common/OverflowTabsList'
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
import { SWIMLANE_OPTIONS, TaskBoard, type SwimlaneBy } from '@/components/tasks/TaskBoard'
import { BoardPeopleFilter, UNASSIGNED_FILTER } from '@/components/tasks/BoardPeopleFilter'
import type { Task } from '@/types/task.types'
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
import { SprintRetrospective } from '@/components/sprints/SprintRetrospective'
import { SprintPlanningSuggestion } from '@/components/sprints/SprintPlanningSuggestion'
import { EpicsList } from '@/components/tasks/EpicsList'
import { EpicRoadmapTimeline } from '@/components/projects/EpicRoadmapTimeline'
import { WorkflowSettingsForm } from '@/components/projects/WorkflowSettingsForm'
import { DefaultApproversForm } from '@/components/projects/DefaultApproversForm'
import { WorkflowCanvas } from '@/components/projects/WorkflowCanvas'
import { FieldsSettingsForm } from '@/components/projects/FieldsSettingsForm'
import { AddLibraryFieldControl } from '@/components/projects/AddLibraryFieldControl'
import { CustomFieldOverridesForm } from '@/components/projects/CustomFieldOverridesForm'
import { SlaPolicySettingsForm } from '@/components/projects/SlaPolicySettingsForm'
import { DependencyGraphView } from '@/components/projects/DependencyGraphView'
import { ReleasesPanel } from '@/components/releases/ReleasesPanel'
import { TimesheetPanel } from '@/components/worklogs/TimesheetPanel'
import { EpicProgressTable } from '@/components/projects/EpicProgressTable'
import { SprintTimeReport } from '@/components/projects/SprintTimeReport'
import { CfdChart } from '@/components/projects/CfdChart'
import { CycleTimeChart } from '@/components/projects/CycleTimeChart'
import { EpicBurndownChart } from '@/components/projects/EpicBurndownChart'
import { IssueTypesSettingsForm } from '@/components/projects/IssueTypesSettingsForm'
import { AutomationRulesForm } from '@/components/projects/AutomationRulesForm'
import { AutomationLogList } from '@/components/projects/AutomationLogList'
import { NotificationSchemeForm } from '@/components/projects/NotificationSchemeForm'
import { PermissionSchemeAssignment } from '@/components/projects/PermissionSchemeAssignment'
import { SecuritySchemeAssignment } from '@/components/projects/SecuritySchemeAssignment'
import { FieldPermissionSchemeAssignment } from '@/components/projects/FieldPermissionSchemeAssignment'
import { RoleAssignmentsPanel } from '@/components/projects/RoleAssignmentsPanel'
import { ImportExportPanel } from '@/components/projects/ImportExportPanel'
import {
  useProject,
  useProjectLabels,
  useProjectStats,
  useProjectTasks,
  useProjectWorkflow,
} from '@/hooks/queries/useProjects'
import { useWorkflowTemplates } from '@/hooks/queries/useWorkflowTemplates'
import { useProjectCategories } from '@/hooks/queries/useProjectCategories'
import { useActiveSprint, useSprints } from '@/hooks/queries/useSprints'
import {
  useDeleteProject,
  useSetProjectArchived,
  useUpdateProject,
} from '@/hooks/mutations/useProjectMutations'
import { useCreateTask } from '@/hooks/mutations/useTaskMutations'
import { useCreateSprint, useUpdateSprint } from '@/hooks/mutations/useSprintMutations'
import { useQueryParams } from '@/hooks/useQueryParams'
import { useAuth } from '@/hooks/useAuth'
import { addRecentlyViewed } from '@/hooks/useRecentlyViewed'
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

const PROJECT_TABS: OverflowTab[] = [
  { value: 'board', label: 'Board' },
  { value: 'backlog', label: 'Backlog' },
  { value: 'sprint-board', label: 'Sprint Board' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'epics', label: 'Epics' },
  { value: 'list', label: 'List' },
  { value: 'members', label: 'Members' },
  { value: 'stats', label: 'Stats' },
  { value: 'reports', label: 'Reports' },
  { value: 'dependencies', label: 'Dependencies' },
  { value: 'releases', label: 'Releases' },
  { value: 'timesheet', label: 'Timesheet' },
  { value: 'activity', label: 'Activity' },
  { value: 'import-export', label: 'Import/Export' },
  { value: 'workflow', label: 'Workflow' },
  { value: 'fields', label: 'Fields' },
  { value: 'issue-types', label: 'Issue Types' },
  { value: 'automation', label: 'Automation' },
  { value: 'notifications', label: 'Notifications' },
  { value: 'sla', label: 'SLA' },
  { value: 'permissions', label: 'Permissions' },
]
const SPRINT_ONLY_TABS = new Set(['backlog', 'sprint-board', 'calendar'])
/** Kanban projects have no sprints, so no Backlog / Sprint Board / Calendar. */
const KANBAN_PROJECT_TABS = PROJECT_TABS.filter((t) => !SPRINT_ONLY_TABS.has(t.value))

/** The issue-type selector's sentinel value for "the project-wide default workflow" - Select
 * doesn't allow an empty-string item value, and `undefined` isn't a valid controlled value. */
const DEFAULT_WORKFLOW_OPTION = '__default__'

const SWIMLANE_STORAGE_KEY = 'ptm.board.groupBy'

/** Board / Sprint Board filter bar: one card holding grouping, people and reset. */
const BOARD_TOOLBAR_CLASS =
  'flex flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-2 shadow-soft'

/** The board's remembered grouping - Assignee by default, so unassigned work is its own section. */
function readStoredSwimlane(): SwimlaneBy {
  try {
    const stored = localStorage.getItem(SWIMLANE_STORAGE_KEY)
    if (stored && (SWIMLANE_OPTIONS as readonly string[]).includes(stored)) {
      return stored as SwimlaneBy
    }
  } catch {
    // Storage blocked - fall through to the default.
  }
  return 'assignee'
}

/** Board people filter: tasks of any selected person, plus unassigned ones when that's picked. */
function filterByPeople(tasks: Task[], selected: string[]): Task[] {
  if (selected.length === 0) return tasks
  const wanted = new Set(selected)
  return tasks.filter((t) =>
    t.assignee ? wanted.has(t.assignee.id) : wanted.has(UNASSIGNED_FILTER),
  )
}

function dedupePeople<T extends { id: string }>(people: T[]): T[] {
  return [...new Map(people.map((p) => [p.id, p])).values()]
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { hasRole, user } = useAuth()
  const { joinProject, leaveProject } = useSocket()

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
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
    // Board/Sprint Board people filter: comma-separated user ids and/or "unassigned". Applied
    // client-side to the loaded board, so any combination of people works.
    people: '',
  })
  const { tab, issueType: issueTypeFilter, epicId, people, ...filters } = state
  const peopleFilter = people ? people.split(',').filter(Boolean) : []
  // Board-only display grouping (see TaskBoard's SwimlaneBy) - not in the URL; remembered per
  // browser, defaulting to Assignee so unassigned work sits in its own section.
  const [swimlaneBy, setSwimlaneByState] = useState<SwimlaneBy>(readStoredSwimlane)
  function setSwimlaneBy(next: SwimlaneBy) {
    setSwimlaneByState(next)
    try {
      localStorage.setItem(SWIMLANE_STORAGE_KEY, next)
    } catch {
      // Storage blocked - the choice simply isn't remembered.
    }
  }
  // Not persisted to the URL, unlike the rest of `filters` - useQueryParams is shared with several
  // pages and typed for scalar values only; these are string arrays.
  const [labelFilter, setLabelFilter] = useState<string[]>([])
  const [componentFilter, setComponentFilter] = useState<string[]>([])
  const [customFieldFilters, setCustomFieldFilters] = useState<
    Array<{ fieldId: string; value: string }>
  >([])

  const { data: project, isLoading, isError, error, refetch } = useProject(id)

  useEffect(() => {
    if (project) {
      addRecentlyViewed({
        id: project.id,
        type: 'project',
        label: project.name,
        path: `/projects/${project.id}`,
      })
    }
  }, [project])
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
  const { data: projectCategories = [] } = useProjectCategories()

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
  const setArchived = useSetProjectArchived(id ?? '')
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
  // Module 8 gap-closure: an archived project is read-only - `canManage` still drives the header's
  // Archive/Restore/Delete, while every editing surface below goes through `canEdit`.
  const isArchived = !!project.archivedAt
  const canEdit = canManage && !isArchived
  const canCreateTaskHere = !isArchived && (canManage || !!myGrant?.canCreateTask)
  const canManageSprintsHere = !isArchived && (canManage || !!myGrant?.canManageSprints)

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

  async function handleSetArchived(archived: boolean) {
    try {
      await setArchived.mutateAsync(archived)
      showToast({
        title: archived ? 'Project archived' : 'Project restored',
        variant: 'success',
      })
    } catch (err) {
      showToast({
        title: archived ? 'Could not archive project' : 'Could not restore project',
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

  // Board + Sprint Board share these: grouping, the people filter (everyone in the project, so
  // anyone can look at anyone's issues) and a reset for both people and "My issues".
  const boardPeople = dedupePeople([project.owner, ...project.members.map((m) => m.user)])
  const boardFiltered = peopleFilter.length > 0 || !!filters.assignee || !!epicId
  const boardPeopleFilter = (
    <BoardPeopleFilter
      people={boardPeople}
      selected={peopleFilter}
      currentUserId={user?.id}
      onChange={(next) => setFilters({ people: next.join(',') })}
    />
  )
  const groupBySelect = (
    <Select value={swimlaneBy} onValueChange={(v) => setSwimlaneBy(v as SwimlaneBy)}>
      <SelectTrigger aria-label="Group into swimlanes" className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="assignee">Group: Assignee</SelectItem>
        <SelectItem value="priority">Group: Priority</SelectItem>
        <SelectItem value="epic">Group: Epic</SelectItem>
        <SelectItem value="none">No grouping</SelectItem>
      </SelectContent>
    </Select>
  )
  const clearBoardFilters = boardFiltered ? (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="ml-auto text-muted-foreground"
      onClick={() => setFilters({ people: '', assignee: undefined, epicId: undefined })}
    >
      <X />
      Clear filters
    </Button>
  ) : null

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        description={project.description}
        actions={
          <div className="flex items-center gap-2">
            <ProjectStatusControl project={project} disabled={!canEdit} />
            {canManage && (
              <>
                {!isArchived && (
                  <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                    Edit
                  </Button>
                )}
                {isArchived ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleSetArchived(false)}
                    loading={setArchived.isPending}
                  >
                    Restore
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setArchiveOpen(true)}>
                    Archive
                  </Button>
                )}
                <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                  Delete
                </Button>
              </>
            )}
          </div>
        }
      />

      {isArchived && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm"
        >
          <Archive className="h-4 w-4 shrink-0" aria-hidden="true" />
          This project is archived and read-only.
          {canManage ? ' Restore it to make changes.' : ''}
        </div>
      )}

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
        <div className="flex items-center justify-between gap-2">
          <OverflowTabsList
            tabs={isKanban ? KANBAN_PROJECT_TABS : PROJECT_TABS}
            value={tab}
            onValueChange={(next) => setFilters({ tab: next })}
          />
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
          <div className={BOARD_TOOLBAR_CLASS}>
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
            {groupBySelect}
            <span className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />
            {boardPeopleFilter}
            {clearBoardFilters}
          </div>
          <TaskBoard
            tasks={filterByPeople(tasksData?.data ?? [], peopleFilter)}
            storageKey={`ptm.board.lanes:${id}`}
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
                  {sprint.status === 'Planned' && id && (
                    <SprintPlanningSuggestion projectId={id} sprint={sprint} />
                  )}
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
            projectId={id ?? ''}
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
              <div className={BOARD_TOOLBAR_CLASS}>
                {groupBySelect}
                <span className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />
                {boardPeopleFilter}
                {clearBoardFilters}
              </div>
              <TaskBoard
                tasks={filterByPeople(sprintBoardData?.data ?? [], peopleFilter)}
                storageKey={`ptm.sprint-board.lanes:${id}`}
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
          <MemberManager project={project} canManage={canEdit} />
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
              <AtRiskIssuesCard projectId={id} />
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
              <SprintRetrospective projectId={id} sprintId={effectiveReportsSprintId} />
              <SprintTimeReport projectId={id} sprintId={effectiveReportsSprintId} />
              <SprintVelocityChart projectId={id} />
              <CfdChart projectId={id} />
              <CycleTimeChart projectId={id} />
              <EpicProgressTable projectId={id} />
              <EpicBurndownChart projectId={id} />
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Sprint history</h3>
                <SprintHistoryList projectId={id} />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="activity">{id && <ProjectActivityFeed projectId={id} />}</TabsContent>

        <TabsContent value="import-export">
          <ImportExportPanel projectId={id ?? ''} canManage={canEdit} />
        </TabsContent>

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
                  {canEdit && workflowTemplates && workflowTemplates.length > 0 && (
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

              {id && (
                <DefaultApproversForm
                  projectId={id}
                  defaultApprovers={project?.defaultApprovers ?? null}
                  canManage={canEdit}
                />
              )}

              {workflowView === 'list' ? (
                <WorkflowSettingsForm
                  key={`${workflowIssueType}-${templateDraft ? 'template' : 'live'}-list`}
                  projectId={id}
                  workflow={templateDraft ?? tabWorkflow}
                  canManage={canEdit}
                  issueType={effectiveWorkflowIssueType}
                  customFields={project?.customFields}
                />
              ) : (
                <WorkflowCanvas
                  key={`${workflowIssueType}-${templateDraft ? 'template' : 'live'}-visual`}
                  projectId={id}
                  workflow={templateDraft ?? tabWorkflow}
                  canManage={canEdit}
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
          <AddLibraryFieldControl projectId={id ?? ''} project={project} canManage={canEdit} />
          <FieldsSettingsForm projectId={id ?? ''} project={project} canManage={canEdit} />
          <CustomFieldOverridesForm projectId={id ?? ''} project={project} canManage={canEdit} />
        </TabsContent>

        <TabsContent value="issue-types">
          <IssueTypesSettingsForm projectId={id ?? ''} project={project} canManage={canEdit} />
        </TabsContent>

        <TabsContent value="automation" className="space-y-6">
          <AutomationRulesForm projectId={id ?? ''} project={project} canManage={canEdit} />
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
            canManage={canEdit}
          />
        </TabsContent>

        <TabsContent value="dependencies">
          <DependencyGraphView projectId={id ?? ''} />
        </TabsContent>

        <TabsContent value="releases">
          <ReleasesPanel projectId={id ?? ''} canManage={canEdit} />
        </TabsContent>

        <TabsContent value="timesheet">
          <TimesheetPanel projectId={id ?? ''} />
        </TabsContent>

        <TabsContent value="sla">
          <SlaPolicySettingsForm projectId={id ?? ''} canManage={canEdit} />
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <PermissionSchemeAssignment
            projectId={id ?? ''}
            permissionSchemeId={project.permissionSchemeId}
            canManage={canEdit}
          />
          <SecuritySchemeAssignment
            projectId={id ?? ''}
            securitySchemeId={project.securitySchemeId ?? null}
            canManage={canEdit}
          />
          <FieldPermissionSchemeAssignment
            projectId={id ?? ''}
            fieldPermissionSchemeId={project.fieldPermissionSchemeId ?? null}
            canManage={canEdit}
          />
          {canEdit && (
            <RoleAssignmentsPanel
              projectId={id ?? ''}
              roleAssignments={project.roleAssignments ?? []}
            />
          )}
        </TabsContent>
      </Tabs>

      <Modal open={editOpen} onOpenChange={setEditOpen} title="Edit project">
        <ProjectForm
          initialValues={project}
          onSubmit={handleUpdate}
          onCancel={() => setEditOpen(false)}
          categories={projectCategories}
        />
      </Modal>

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive project"
        description="The project will be hidden from the Projects list and dashboards, and become read-only until restored. Nothing is deleted."
        confirmLabel="Archive"
        onConfirm={() => handleSetArchived(true)}
      />

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
