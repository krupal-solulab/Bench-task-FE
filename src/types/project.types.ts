import type { SortOrder } from './api.types'
import type { User } from './user.types'
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
}

export const NO_MEMBER_PERMISSIONS: MemberPermissions = {
  canCreateTask: false,
  canEditAnyTask: false,
  canDeleteTask: false,
  canChangeAnyTaskStatus: false,
  canManageSprints: false,
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
  customFields: CustomFieldDefinition[]
  automationRules: AutomationRule[]
  issueTypes: IssueTypeDefinition[]
  // Null means "use the legacy per-member permission flags" - see MemberPermissions above.
  permissionSchemeId: string | null
  notificationScheme: NotificationSchemeRule[]
  // Optional (rather than required) so existing test fixtures/mocks predating this field don't
  // all need updating - absent means Scrum, matching the backend's own default.
  boardType?: BoardType
  createdAt: string
  updatedAt: string
}

export interface ProjectListQuery {
  page?: number
  limit?: number
  search?: string
  status?: ProjectStatus
  owner?: string
  member?: string
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
}

export type UpdateProjectPayload = Partial<CreateProjectPayload>

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
