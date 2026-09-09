import type { SortOrder } from './api.types'
import type { User } from './user.types'

export const TASK_STATUSES = ['Todo', 'In Progress', 'Review', 'Done'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_PRIORITIES = ['P1', 'P2', 'P3'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export interface TaskProjectSummary {
  id: string
  name: string
}

export interface Task {
  id: string
  title: string
  description: string
  project: TaskProjectSummary
  assignee: User | null
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  createdBy: User
  createdAt: string
  updatedAt: string
}

export interface TaskListQuery {
  page?: number
  limit?: number
  project?: string
  assignee?: string
  status?: TaskStatus
  priority?: TaskPriority
  dueDateFrom?: string
  dueDateTo?: string
  overdue?: boolean
  search?: string
  sortBy?: 'dueDate' | 'priority' | 'createdAt' | 'status'
  sortOrder?: SortOrder
}

export interface CreateTaskPayload {
  title: string
  description: string
  project: string
  assignee?: string | null
  priority: TaskPriority
  dueDate?: string | null
}

export type UpdateTaskPayload = Partial<Omit<CreateTaskPayload, 'project'>>

export interface UpdateTaskStatusPayload {
  status: TaskStatus
}

export interface UpdateTaskAssigneePayload {
  assignee: string | null
}

export interface TaskActivityEntry {
  id: string
  action: string
  from: string | null
  to: string | null
  actor: User
  createdAt: string
}
