import type { Role } from './user.types'

export interface SecurityLevel {
  name: string
  allowedRoles: Role[]
  allowedUserIds: string[]
  allowedTeamIds: string[]
  allowedProjectRoleIds: string[]
}

export interface SecurityScheme {
  id: string
  organizationId: string
  name: string
  levels: SecurityLevel[]
  createdAt: string
  updatedAt: string
}

export interface CreateSecuritySchemePayload {
  name: string
  levels: SecurityLevel[]
}

export type UpdateSecuritySchemePayload = Partial<CreateSecuritySchemePayload>
