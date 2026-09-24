import { buildEpicRoadmapData } from './epic-roadmap'
import type { RoadmapEpic } from '@/types/issue-link.types'

export interface RoadmapChartRow {
  epicId: string
  title: string
  progress: number
  offsetDays: number
  durationDays: number
  projectId: string
  projectName: string
  blockedByExternal: RoadmapEpic['blockedByExternal']
}

export interface RoadmapChartData {
  rows: RoadmapChartRow[]
  totalDays: number
}

/**
 * Module 1's cross-project roadmap chart data - reuses the per-project Epic roadmap's day-offset
 * math (buildEpicRoadmapData) rather than re-deriving it, then enriches each row with the project
 * it belongs to (for color-coding) and its cross-project blocking warnings.
 */
export function buildRoadmapChartData(epics: RoadmapEpic[]): RoadmapChartData | null {
  const base = buildEpicRoadmapData(epics)
  if (!base) return null

  const epicById = new Map(epics.map((e) => [e.epicId, e]))
  const rows: RoadmapChartRow[] = base.rows.map((row) => {
    const epic = epicById.get(row.epicId)!
    return {
      ...row,
      projectId: epic.project.id,
      projectName: epic.project.name,
      blockedByExternal: epic.blockedByExternal,
    }
  })
  return { rows, totalDays: base.totalDays }
}

const PROJECT_PALETTE = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
]

/** Cycles through a fixed palette by each project's position in `projectIds` - stable as long as
 * that list's order doesn't change within a single render. */
export function colorForProject(projectId: string, projectIds: string[]): string {
  const index = projectIds.indexOf(projectId)
  return PROJECT_PALETTE[index % PROJECT_PALETTE.length] ?? PROJECT_PALETTE[0]!
}
