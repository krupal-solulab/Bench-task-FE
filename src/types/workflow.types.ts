import type { OrgRole } from './user.types'

export const STATUS_CATEGORIES = ['To Do', 'In Progress', 'Done'] as const
export type StatusCategory = (typeof STATUS_CATEGORIES)[number]

export interface WorkflowStatus {
  name: string
  category: StatusCategory
}

export interface WorkflowTransition {
  from: string
  to: string
  /** Condition: only these roles may make this transition. Unset = unrestricted (default). */
  allowedRoles?: OrgRole[]
  /** Validator: the task must already have a comment before this transition is allowed. */
  requireComment?: boolean
}

export interface Workflow {
  statuses: WorkflowStatus[]
  transitions: WorkflowTransition[]
  initialStatus: string
}
