import type { Role } from './user.types'

/** Every built-in Task field this scheme can target, besides a project's own custom field ids -
 * mirrors the backend's BUILT_IN_TASK_FIELD_IDS exactly. Deliberately excludes assignee/status,
 * which already have their own dedicated access mechanisms (Permission Schemes, Approval
 * Workflows). */
export const BUILT_IN_TASK_FIELD_IDS = [
  'title',
  'description',
  'priority',
  'dueDate',
  'labels',
  'components',
  'fixVersions',
  'affectsVersions',
  'storyPoints',
  'originalEstimateHours',
  'securityLevel',
] as const

export interface FieldPermissionRule {
  fieldId: string
  hiddenFromRoles: Role[]
  readOnlyForRoles: Role[]
}

export interface FieldPermissionScheme {
  id: string
  organizationId: string
  name: string
  rules: FieldPermissionRule[]
  createdAt: string
  updatedAt: string
}

export interface CreateFieldPermissionSchemePayload {
  name: string
  rules: FieldPermissionRule[]
}

export type UpdateFieldPermissionSchemePayload = Partial<CreateFieldPermissionSchemePayload>
