import type { CustomRoleColor } from './custom-role.types'
import type { SortOrder } from './api.types'
import type { OrgRole, User } from './user.types'
import type { IssueTypeDefinition } from './issue-type.types'
import type { NotificationSchemeRule } from './notification-scheme.types'
import type { TaskPriority } from './task.types'

export const PROJECT_STATUSES = ['Planning', 'In Progress', 'Completed'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export interface MemberPermissions {
  canCreateTask: boolean
  canEditAnyTask: boolean
  canDeleteTask: boolean
  canChangeAnyTaskStatus: boolean
  canManageSprints: boolean
  /** Manage the project: details, members & invites, sprints & releases, settings. */
  canManageProject: boolean
}

export const NO_MEMBER_PERMISSIONS: MemberPermissions = {
  canCreateTask: false,
  canEditAnyTask: false,
  canDeleteTask: false,
  canChangeAnyTaskStatus: false,
  canManageSprints: false,
  canManageProject: false,
}

export interface ProjectMember {
  user: User
  role: 'owner' | 'member'
  joinedAt: string
  // Extra per-project task/sprint capabilities granted beyond the member's global role - null on
  // the owner row (owners already have full access) and for a member nobody has configured yet.
  permissions: MemberPermissions | null
}

export const CUSTOM_FIELD_TYPES = [
  'Text',
  'Number',
  'Date',
  'Dropdown',
  'Checkbox',
  'MultiSelect',
  'UserPicker',
] as const
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number]

export interface CustomFieldDefinition {
  // Stable identity, assigned once by the server - stored task values are keyed by this, not by
  // `name`, so renaming a field never orphans data already stored under its id.
  id: string
  name: string
  type: CustomFieldType
  required: boolean
  // Only meaningful (and only ever set) for type === 'Dropdown' or 'MultiSelect'.
  options: string[] | null
}

// A per-issue-type override of which custom fields are hidden, or forced required/optional -
// fetched/set via dedicated endpoints (mirrors how per-issue-type workflows aren't embedded on
// `Project` either - see useProjectWorkflow/useUpdateWorkflow).
export interface CustomFieldOverrideByType {
  issueType: string
  hiddenFieldIds: string[]
  requiredFieldIds: string[]
  optionalFieldIds: string[]
}

// A project's SLA resolution-time targets (Search/Dashboards v2) - fetched/set via dedicated
// endpoints, same as workflow/custom-field overrides above; not embedded on `Project`. GET always
// returns the resolved (non-empty) policy - the system default until a project configures its
// own; PUT with an empty array resets a project back to that default.
export interface SlaPolicyEntry {
  priority: TaskPriority
  resolutionHours: number
}

export const AUTOMATION_TRIGGER_TYPES = [
  'IssueCreated',
  'StatusChanged',
  'UnassignedForDuration',
  'AllSubtasksDone',
  // Module 12 gap-closure - extended triggers.
  'ApprovalRequested',
  'ApprovalDecided',
  'AssigneeChanged',
  'PriorityChanged',
  'CommentAdded',
] as const
export type AutomationTriggerType = (typeof AUTOMATION_TRIGGER_TYPES)[number]

export const AUTOMATION_ACTION_TYPES = [
  'SetStatus',
  'SetPriority',
  'SetAssignee',
  'AddLabels',
  'AddComment',
  'Webhook',
  'NotifyRole',
] as const
export type AutomationActionType = (typeof AUTOMATION_ACTION_TYPES)[number]

export const AUTOMATION_CONDITION_FIELDS = ['IssueType', 'Priority', 'Component'] as const
export type AutomationConditionField = (typeof AUTOMATION_CONDITION_FIELDS)[number]

export interface AutomationCondition {
  field: AutomationConditionField
  value: string
}

export interface AutomationAction {
  type: AutomationActionType
  value: string
}

export interface AutomationTrigger {
  type: AutomationTriggerType
  // Only meaningful (and only ever set) for type === 'StatusChanged'.
  toStatus: string | null
  // Further scopes a StatusChanged trigger to one specific from->to edge. Unset means "any status
  // -> toStatus" - matches the backend's automation-rule.schema.ts shape exactly.
  fromStatus?: string | null
  // Only meaningful (and required) for type === 'UnassignedForDuration'.
  afterHours?: number | null
  // Module 12 gap-closure - optional scopes for ApprovalDecided / PriorityChanged (null = any).
  approvalOutcome?: 'approved' | 'rejected' | null
  toPriority?: 'P1' | 'P2' | 'P3' | null
}

export interface AutomationRule {
  // Stable identity, assigned once by the server - same convention as CustomFieldDefinition.id.
  id: string
  name: string
  enabled: boolean
  trigger: AutomationTrigger
  // AND-combined; empty means "always match".
  conditions: AutomationCondition[]
  actions: AutomationAction[]
}

export const BOARD_TYPES = ['Kanban', 'Scrum'] as const
export type BoardType = (typeof BOARD_TYPES)[number]

export interface Project {
  id: string
  name: string
  description: string
  status: ProjectStatus
  owner: User
  members: ProjectMember[]
  startDate: string
  dueDate: string | null
  taskCount: number
  // Project-defined pick-list (e.g. "Frontend", "API") - names are the identity.
  components: string[]
  // Module 6 gap-closure - optional for the same "existing fixtures predate this field" reason as
  // roleAssignments/securitySchemeId below; absent/empty means no component has an assigned lead.
  componentLeads?: ComponentLead[]
  customFields: CustomFieldDefinition[]
  automationRules: AutomationRule[]
  issueTypes: IssueTypeDefinition[]
  // Null means "use the legacy per-member permission flags" - see MemberPermissions above.
  permissionSchemeId: string | null
  notificationScheme: NotificationSchemeRule[]
  // Optional (rather than required) so existing test fixtures/mocks predating this field don't
  // all need updating - absent means Scrum, matching the backend's own default.
  boardType?: BoardType
  // Module 6 - optional (rather than required) so existing test fixtures/mocks predating this
  // field don't all need updating; absent means "no Project Roles assigned yet" / "no security
  // scheme assigned", matching the backend's own defaults.
  roleAssignments?: ProjectRoleAssignment[]
  // Module 6 gap-closure - a project-wide fallback approver pool for Approval Workflows,
  // additive on top of (never instead of) each transition's own approver fields. Optional/null
  // for the same "existing fixtures predate this field" reason as the rest of this block.
  defaultApprovers?: DefaultApproversPayload | null
  // Module 8 gap-closure - optional for the same "fixtures predate this field" reason; null/absent
  // means uncategorized.
  categoryId?: string | null
  // Module 8 gap-closure - offered as a starting point for new projects; absent means false.
  isTemplate?: boolean
  // Module 8 gap-closure - set while archived (hidden by default, read-only); absent means active.
  archivedAt?: string | null
  securitySchemeId?: string | null
  // Module 12 - optional for the same reason as securitySchemeId above; absent/null means no
  // field is view/edit-restricted beyond what Security/Permission Schemes already cover.
  fieldPermissionSchemeId?: string | null
  createdAt: string
  updatedAt: string
  /** Per-project role permission overrides (absent on older responses). */
  rolePermissionOverrides?: RolePermissionOverride[]
}

export interface ProjectRoleAssignment {
  projectRoleId: string
  userIds: string[]
  teamIds: string[]
}

// Module 6 gap-closure: which member (if any) leads a component, keyed by the component's own
// name (the same identity `Project.components` already uses).
export interface ComponentLead {
  name: string
  leadUserId: string | null
}

// Same 4-grantee-kind shape as WorkflowTransition's approver* fields (see workflow.types.ts) -
// reused here for the project-wide default-approver grant.
export interface DefaultApproversPayload {
  allowedRoles: OrgRole[]
  allowedUserIds: string[]
  allowedTeamIds: string[]
  allowedProjectRoleIds: string[]
}

export interface ProjectListQuery {
  page?: number
  limit?: number
  search?: string
  status?: ProjectStatus
  owner?: string
  member?: string
  category?: string
  isTemplate?: 'true' | 'false'
  /** Module 8 - archived projects are hidden unless 'true' (only archived) or 'all'. */
  archived?: 'false' | 'true' | 'all'
  sortBy?: 'name' | 'dueDate' | 'createdAt' | 'status'
  sortOrder?: SortOrder
}

export interface CreateProjectPayload {
  name: string
  description: string
  startDate?: string | null
  dueDate?: string | null
  memberIds?: string[]
  boardType?: BoardType
  categoryId?: string | null
  isTemplate?: boolean
  /** Create only - copy this project's configuration (Module 8 project templates). */
  templateProjectId?: string
}

export type UpdateProjectPayload = Partial<Omit<CreateProjectPayload, 'templateProjectId'>>

export interface ProjectStats {
  totalTasks: number
  tasksByStatus: Record<string, number>
  tasksByPriority: Record<string, number>
  overdueCount: number
  completionRate: number
}

export interface ProjectActivityEntry {
  id: string
  action: string
  from: string | null
  to: string | null
  actor: User
  createdAt: string
}

export const AUTOMATION_LOG_OUTCOMES = ['success', 'failure'] as const
export type AutomationLogOutcome = (typeof AUTOMATION_LOG_OUTCOMES)[number]

/** BRD 8's automation audit trail entry - one per fired action, written whether it succeeded or
 * failed (see GET /projects/:id/automation-log). */
export interface AutomationLogEntry {
  id: string
  ruleId: string
  ruleName: string
  triggerType: AutomationTriggerType
  actionSummaries: string[]
  outcome: AutomationLogOutcome
  errorMessage: string | null
  task: { id: string; title: string; issueKey: string } | null
  createdAt: string
}

/** Module 9's Cumulative Flow Diagram: one point per day, counting tasks by status category as of
 * that day's end (reconstructed server-side from each task's status-change history). */
export interface CfdPoint {
  date: string
  toDo: number
  inProgress: number
  done: number
}

/** Module 9's Control Chart: per-issue lead time (creation to completion) and cycle time (first
 * status change to completion) for every issue completed within the requested window. */
export interface CycleTimePoint {
  taskId: string
  issueKey: string | null
  title: string
  completedAt: string
  leadTimeHours: number
  cycleTimeHours: number
}

export interface CycleTimeReport {
  points: CycleTimePoint[]
  averageLeadTimeHours: number | null
  averageCycleTimeHours: number | null
}

/** A project's replacement for one role's organization-wide permissions (Admin-managed). */
export interface RolePermissionOverride {
  roleId: string
  permissions: MemberPermissions
}

/** One row of a project's "Role permissions" table. */
export interface ProjectRolePermissionRow {
  roleId: string
  name: string
  color: CustomRoleColor
  builtInRole: 'Manager' | 'Developer' | null
  defaults: MemberPermissions
  override: MemberPermissions | null
  effective: MemberPermissions
}
