export const STATUS_CATEGORIES = ['To Do', 'In Progress', 'Done'] as const
export type StatusCategory = (typeof STATUS_CATEGORIES)[number]

export interface WorkflowStatus {
  name: string
  category: StatusCategory
}

export interface WorkflowTransition {
  from: string
  to: string
}

export interface Workflow {
  statuses: WorkflowStatus[]
  transitions: WorkflowTransition[]
  initialStatus: string
}
