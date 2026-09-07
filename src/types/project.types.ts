import type { SortOrder } from './api.types'
import type { User } from './user.types'

export const PROJECT_STATUSES = ['Planning', 'In Progress', 'Completed'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export interface ProjectMember {
  user: User
  role: 'owner' | 'member'
  joinedAt: string
}

export interface Project {
  id: string
  name: string
  description: string
  status: ProjectStatus
  owner: User
  members: ProjectMember[]
  startDate: string
  dueDate: string | null
  taskCount: number
  createdAt: string
  updatedAt: string
}

export interface ProjectListQuery {
  page?: number
  limit?: number
  search?: string
  status?: ProjectStatus
  owner?: string
  member?: string
  sortBy?: 'name' | 'dueDate' | 'createdAt' | 'status'
  sortOrder?: SortOrder
}

export interface CreateProjectPayload {
  name: string
  description: string
  startDate?: string | null
  dueDate?: string | null
  memberIds?: string[]
}

export type UpdateProjectPayload = Partial<CreateProjectPayload>

export interface ProjectStats {
  totalTasks: number
  tasksByStatus: Record<string, number>
  tasksByPriority: Record<string, number>
  overdueCount: number
  completionRate: number
}
