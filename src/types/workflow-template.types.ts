import type { Workflow } from './workflow.types'

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  workflow: Workflow
  createdAt: string
  updatedAt: string
}
