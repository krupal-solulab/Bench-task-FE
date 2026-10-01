export const AUDIT_ACTIONS = [
  'UserCreated',
  'UserUpdated',
  'UserRoleChanged',
  'UserStatusChanged',
  'OrganizationSettingsUpdated',
  'PermissionSchemeCreated',
  'PermissionSchemeUpdated',
  'PermissionSchemeDeleted',
  'SecuritySchemeCreated',
  'SecuritySchemeUpdated',
  'SecuritySchemeDeleted',
  'TeamCreated',
  'TeamUpdated',
  'TeamDeleted',
  'ProjectRoleCreated',
  'ProjectRoleUpdated',
  'ProjectRoleDeleted',
  'IssueTemplateCreated',
  'IssueTemplateUpdated',
  'IssueTemplateDeleted',
  'FieldPermissionSchemeCreated',
  'FieldPermissionSchemeUpdated',
  'FieldPermissionSchemeDeleted',
  'ProjectCategoryCreated',
  'ProjectCategoryUpdated',
  'ProjectCategoryDeleted',
  'LibraryFieldCreated',
  'LibraryFieldUpdated',
  'LibraryFieldDeleted',
  'ImpersonationStarted',
  'ImpersonationEnded',
] as const
export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export interface AuditLogActor {
  id: string
  name: string
  email: string
}

export interface AuditLogEntry {
  id: string
  organizationId: string
  actor: AuditLogActor
  action: AuditAction
  targetType: string
  targetId: string | null
  targetLabel: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export interface AuditLogListQuery {
  page?: number
  limit?: number
  action?: AuditAction
  actorId?: string
  dateFrom?: string
  dateTo?: string
  sortOrder?: 'asc' | 'desc'
}
