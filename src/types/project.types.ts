import type { SortOrder } from './api.types'
import type { User } from './user.types'

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

export const CUSTOM_FIELD_TYPES = ['Text', 'Number', 'Date', 'Dropdown', 'Checkbox'] as const
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number]

export interface CustomFieldDefinition {
  // Stable identity, assigned once by the server - stored task values are keyed by this, not by
  // `name`, so renaming a field never orphans data already stored under its id.
  id: string
  name: string
  type: CustomFieldType
  required: boolean
  // Only meaningful (and only ever set) for type === 'Dropdown'.
  options: string[] | null
}

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
