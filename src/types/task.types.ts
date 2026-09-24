import type { SortOrder } from './api.types'
import type { User } from './user.types'
import type { StatusCategory } from './workflow.types'
import type { ReleaseSummary } from './release.types'

// The system default workflow's 4 status names - still used as the fallback status list/filter
// options for any project that hasn't configured a custom workflow (see status-transitions.ts's
// DEFAULT_WORKFLOW). A task's actual `status` is a free-form string once a project has a custom
// workflow - see Task.status below.
export const TASK_STATUSES = ['Todo', 'In Progress', 'Review', 'Done'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_PRIORITIES = ['P1', 'P2', 'P3'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

// The 5 built-in issue type names - still the fallback whenever a project hasn't configured its
// own issue types (see issue-type.types.ts's DEFAULT_ISSUE_TYPES/resolveIssueTypes). A task's
// actual `issueType` is a free-form string once a project has customized its issue types (the
// BRD's "extensible" Standard level) - see Task.issueType below.
export const ISSUE_TYPES = ['Epic', 'Story', 'Task', 'Bug', 'Sub-task'] as const
export type IssueType = (typeof ISSUE_TYPES)[number]

/** The "standard issue" level - the only level that can carry a Sprint or an Epic-link. Prefer
 * `standardIssueTypeNames(project)` (issue-type.types.ts) when a project is in scope, since a
 * project may have renamed/added to this set - this fixed list is only the built-in fallback. */
export const STANDARD_ISSUE_TYPES: IssueType[] = ['Story', 'Task', 'Bug']

export interface TaskProjectSummary {
  id: string
  name: string
}

export interface TaskSprintSummary {
  id: string
  name: string
}

export interface TaskParentSummary {
  id: string
  title: string
  issueKey: string | null
}

export interface Task {
  id: string
  title: string
  description: string
  project: TaskProjectSummary
  assignee: User | null
  // A status name from the task's project workflow (custom, or the system default) - a free-form
  // string, not limited to TASK_STATUSES, once a project has a custom workflow.
  status: string
  statusCategory: StatusCategory
  priority: TaskPriority
  dueDate: string | null
  createdBy: User
  sprint: TaskSprintSummary | null
  rank: number
  // One of the project's enabled issue types - the 5 built-ins, or a custom Standard-level type
  // the Org Admin added (see issue-type.types.ts), so this is a free-form string, not `IssueType`.
  issueType: string
  parent: TaskParentSummary | null
  storyPoints: number | null
  issueKey: string | null
  labels: string[]
  components: string[]
  // Module 2's "Fix Version" / "Affects Version" (BRD: Releases & Version Management).
  fixVersions: ReleaseSummary[]
  affectsVersions: ReleaseSummary[]
  // Module 3's "Original Estimate" (BRD: Time Tracking & Work Logs), in hours.
  originalEstimateHours: number | null
  // Keyed by the project's CustomFieldDefinition.id, not name.
  customFieldValues: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface TaskListQuery {
  page?: number
  limit?: number
  project?: string
  assignee?: string
  status?: string
  priority?: TaskPriority
  dueDateFrom?: string
  dueDateTo?: string
  overdue?: boolean
  search?: string
  sprintId?: string
  unassignedSprint?: boolean
  issueType?: string[]
  parent?: string
  labels?: string[]
  components?: string[]
  // Equals-match against a custom field's value (Text/Dropdown only), ANDed.
  customFieldFilters?: Array<{ fieldId: string; value: string }>
  sortBy?: 'dueDate' | 'priority' | 'createdAt' | 'status' | 'rank'
  sortOrder?: SortOrder
}

export interface CreateTaskPayload {
  title: string
  description: string
  project: string
  assignee?: string | null
  priority: TaskPriority
  dueDate?: string | null
  issueType?: string
  parent?: string | null
  storyPoints?: number | null
  labels?: string[]
  components?: string[]
  fixVersions?: string[]
  affectsVersions?: string[]
  originalEstimateHours?: number | null
  customFieldValues?: Record<string, unknown>
}

export type UpdateTaskPayload = Partial<Omit<CreateTaskPayload, 'project'>>

export interface UpdateTaskStatusPayload {
  status: string
}

export interface UpdateTaskAssigneePayload {
  assignee: string | null
}

export interface UpdateTaskSprintPayload {
  sprintId: string | null
}

export interface UpdateTaskRankPayload {
  beforeTaskId?: string
  afterTaskId?: string
}

export interface BulkOperationResult {
  succeeded: string[]
  failed: Array<{ taskId: string; message: string }>
}

export interface BulkMoveSprintPayload {
  taskIds: string[]
  sprintId: string | null
}

export interface BulkAssignPayload {
  taskIds: string[]
  assignee: string | null
}

export interface BulkRelabelPayload {
  taskIds: string[]
  labels: string[]
}

export interface EpicProgress {
  linkedIssueCount: number
  doneCount: number
  progress: number
}

export interface EpicProgressReportEntry {
  epicId: string
  issueKey: string | null
  title: string
  linkedIssueCount: number
  doneCount: number
  progress: number
  // BRD 6.4's Epics View target date + roadmap timeline - optional so existing test
  // fixtures/mocks predating this field don't all need updating.
  dueDate?: string | null
  createdAt?: string
}

/** A JQL-lite compound query (Search/Dashboards v2) - see the backend's jql.util.ts for the
 * supported grammar. A separate, opt-in mode alongside the fixed-shape TaskListQuery above. */
export interface TaskSearchQuery {
  jql: string
  page?: number
  limit?: number
}

export interface TaskActivityEntry {
  id: string
  action: string
  from: string | null
  to: string | null
  actor: User
  // Set only when an automation rule's action produced this entry, rather than `actor` directly.
  viaAutomationRule: string | null
  createdAt: string
}
