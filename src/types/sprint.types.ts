import type { SortOrder } from './api.types'
import type { User } from './user.types'

export const SPRINT_STATUSES = ['Planned', 'Active', 'Completed'] as const
export type SprintStatus = (typeof SPRINT_STATUSES)[number]

export interface Sprint {
  id: string
  name: string
  goal: string
  project: string
  status: SprintStatus
  startDate: string
  endDate: string
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SprintListQuery {
  page?: number
  limit?: number
  status?: SprintStatus[]
  sortOrder?: SortOrder
}

export interface CreateSprintPayload {
  name: string
  goal?: string
  startDate: string
  endDate: string
}

export type UpdateSprintPayload = Partial<CreateSprintPayload>

export interface SprintActivityEntry {
  id: string
  action: string
  from: string | null
  to: string | null
  actor: User
  createdAt: string
}

export interface SprintVelocityEntry {
  sprintId: string
  name: string
  completedAt: string | null
  completedPoints: number
  completedCount: number
}

export interface SprintBurndownPoint {
  date: string
  remainingPoints: number
  remainingCount: number
  idealRemainingPoints: number
  idealRemainingCount: number
}

export interface SprintBurndownResult {
  points: SprintBurndownPoint[]
  hasStoryPoints: boolean
}
