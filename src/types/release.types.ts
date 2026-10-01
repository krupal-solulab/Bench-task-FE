import type { SortOrder } from './api.types'

export const RELEASE_STATUSES = ['Unreleased', 'Released', 'Archived'] as const
export type ReleaseStatus = (typeof RELEASE_STATUSES)[number]

export interface Release {
  id: string
  name: string
  description: string
  project: string
  status: ReleaseStatus
  releaseDate: string | null
  releasedAt: string | null
  /** The person responsible for shipping this release - purely informational, id-only (no
   * population from the backend), so a name lookup goes through the org's user list. */
  ownerId: string | null
  createdAt: string
  updatedAt: string
}

/** A release as populated onto a Task's fixVersions/affectsVersions - just enough to render a
 * chip and look up the full record via ReleasesPanel's own list. */
export interface ReleaseSummary {
  id: string
  name: string
  status: ReleaseStatus
}

export interface ReleaseListQuery {
  page?: number
  limit?: number
  status?: ReleaseStatus[]
  sortOrder?: SortOrder
}

export interface CreateReleasePayload {
  name: string
  description?: string
  releaseDate?: string | null
  ownerId?: string | null
}

export type UpdateReleasePayload = Partial<CreateReleasePayload>

/** Module 9 gap-closure - a linear projection from recent throughput (see release-eta.util.ts). */
export interface ReleaseEta {
  remainingIssues: number
  throughputPerWeek: number | null
  basis: 'release' | 'project' | null
  projectedDate: string | null
  onTrack: boolean | null
  daysLate: number | null
}

export interface ReleaseForecastRow {
  releaseId: string
  name: string
  releaseDate: string | null
  totalIssues: number
  doneIssues: number
  progress: number
  eta: ReleaseEta
}

export interface ReleaseProgress {
  releaseId: string
  totalIssues: number
  doneIssues: number
  progress: number
  unreleasedIssues: Array<{
    id: string
    issueKey: string | null
    title: string
    status: string
    statusCategory: string
  }>
  /** Module 9 gap-closure - optional so fixtures predating it stay valid. */
  eta?: ReleaseEta
}

export interface ReleaseCompareIssue {
  id: string
  issueKey: string | null
  title: string
  statusCategory: string
}

export interface ReleaseCompareResult {
  onlyInA: ReleaseCompareIssue[]
  onlyInB: ReleaseCompareIssue[]
  inBoth: ReleaseCompareIssue[]
}

export interface ReleaseNotes {
  releaseId: string
  releaseName: string
  issueCount: number
  markdown: string
  generatedAt: string
}
