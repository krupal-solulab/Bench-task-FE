import type { OrgRole } from './user.types'

export const STATUS_CATEGORIES = ['To Do', 'In Progress', 'Done'] as const
export type StatusCategory = (typeof STATUS_CATEGORIES)[number]

export interface WorkflowStatus {
  name: string
  category: StatusCategory
  /** WIP limit for this column on the board. Unset = no limit (default). */
  wipLimit?: number
}

export interface WorkflowTransition {
  from: string
  to: string
  /** Condition: only these roles may make this transition. Unset = unrestricted (default). */
  allowedRoles?: OrgRole[]
  /** Validator: the task must already have a comment before this transition is allowed. */
  requireComment?: boolean
  /** Validator: custom field ids that must already have a value before this transition. */
  requiredCustomFieldIds?: string[]
  /** Module 12's Approval Workflows: don't apply this transition immediately - wait for a
   * separate approve/reject call from an eligible approver (the 4 approver* fields below).
   * Unset/false = immediate application (default). */
  requiresApproval?: boolean
  approverRoles?: OrgRole[]
  approverUserIds?: string[]
  approverTeamIds?: string[]
  approverProjectRoleIds?: string[]
  /** Module 12 gap-closure: how many different approvers must approve (unset = 1). */
  requiredApprovals?: number
}

/** Module 12 - a snapshot of a requiresApproval transition's approver grantees, taken when the
 * transition was requested (not a live reference back to the workflow rule). Null means no
 * transition is currently awaiting a decision on this task. */
export interface PendingApproval {
  toStatus: string
  requestedBy: string
  requestedAt: string
  approverRoles: OrgRole[]
  approverUserIds: string[]
  approverTeamIds: string[]
  approverProjectRoleIds: string[]
  /** Module 12 gap-closure - absent on requests made before multi-approver support (= 1). */
  requiredApprovals?: number
  approvals?: Array<{ user: string; at: string }>
}

export interface Workflow {
  statuses: WorkflowStatus[]
  transitions: WorkflowTransition[]
  initialStatus: string
}
