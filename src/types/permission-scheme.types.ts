import type { Role } from './user.types'

export const SCHEME_ACTIONS = [
  'CreateIssue',
  'Assign',
  'Transition',
  'Delete',
  'EditCustomFields',
  'ManageSprint',
] as const
export type SchemeAction = (typeof SCHEME_ACTIONS)[number]

export interface PermissionGrant {
  action: SchemeAction
  allowedRoles: Role[]
  allowedUserIds: string[]
}

export interface PermissionScheme {
  id: string
  organizationId: string
  name: string
  grants: PermissionGrant[]
  createdAt: string
  updatedAt: string
}

export interface CreatePermissionSchemePayload {
  name: string
  grants: PermissionGrant[]
}

export type UpdatePermissionSchemePayload = Partial<CreatePermissionSchemePayload>
