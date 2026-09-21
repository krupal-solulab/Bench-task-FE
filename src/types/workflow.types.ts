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
}

export interface Workflow {
  statuses: WorkflowStatus[]
  transitions: WorkflowTransition[]
  initialStatus: string
}
