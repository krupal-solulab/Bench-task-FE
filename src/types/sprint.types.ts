import type { SortOrder } from './api.types'
import type { User } from './user.types'

export const SPRINT_STATUSES = ['Planned', 'Active', 'Completed'] as const
export type SprintStatus = (typeof SPRINT_STATUSES)[number]

export const SPRINT_DURATION_WEEKS = [1, 2, 3, 4] as const
export type SprintDurationWeeks = (typeof SPRINT_DURATION_WEEKS)[number]

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
  capacityPoints?: number | null
  initialTaskIds?: string[]
  completionRatePercent?: number | null
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
  /** Required unless durationWeeks is given (a custom date range). */
  endDate?: string
  durationWeeks?: SprintDurationWeeks
  capacityPoints?: number
}

export type UpdateSprintPayload = Partial<CreateSprintPayload>

export interface CompleteSprintPayload {
  /** Omit/null for the default (the backlog); a Planned sprint id moves incomplete issues there
   * instead (BRD 6.3's "PM's choice"). */
  nextSprintId?: string | null
}

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

/** Module 9's sprint retrospective. `carryoverCount`/`carryoverPoints` means "not Done as of now" -
 * meaningful for both an Active sprint (still remaining) and a Completed one (carried over at
 * completion); label it based on the sprint's own status. `addedCount`/`addedPoints` is a raw
 * scope-churn figure - it still includes a task that was added and later explicitly removed. */
export interface SprintRetrospective {
  plannedCount: number
  plannedPoints: number
  addedCount: number
  addedPoints: number
  completedCount: number
  completedPoints: number
  removedCount: number
  removedPoints: number
  carryoverCount: number
  carryoverPoints: number
  completionRatePercent: number | null
}

/** Module 10's deterministic (non-LLM - see the backend's `sprint-planning.util.ts`) sprint
 * planning suggestion: which ranked backlog items would fit this Planned sprint. */
export interface SprintPlanningSuggestion {
  suggestedTaskIds: string[]
  suggestedPoints: number
  suggestedCount: number
  targetPoints: number | null
  targetCount: number | null
  basis: 'capacity' | 'velocity' | 'none'
}
