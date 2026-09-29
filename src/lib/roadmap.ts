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
  startDate: string
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
  return { rows, totalDays: base.totalDays, startDate: base.startDate }
}

/** Zoom granularity for the Roadmap X-axis - buckets the underlying day-offset axis into whole
 * weeks/months/quarters, so the same "day N" data can be read at a coarser calendar scale without
 * touching the day-based math the bars are actually plotted on. */
export type RoadmapGranularity = 'week' | 'month' | 'quarter'

const DAY_MS = 24 * 60 * 60 * 1000
const BUCKET_DAYS: Record<RoadmapGranularity, number> = { week: 7, month: 30, quarter: 91 }

/** Tick positions (in day-offset units) at each bucket boundary from 0 through totalDays. */
export function buildRoadmapTicks(totalDays: number, granularity: RoadmapGranularity): number[] {
  const step = BUCKET_DAYS[granularity]
  const ticks: number[] = []
  for (let day = 0; day <= totalDays; day += step) ticks.push(day)
  if (ticks[ticks.length - 1] !== totalDays) ticks.push(totalDays)
  return ticks
}

// Pinned to 'en-US' like the rest of this codebase's date formatting (see lib/date.ts) - the
// runtime's default locale would make tick labels (and their tests) depend on the host's locale.
const weekTickFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
const monthTickFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' })

/**
 * Pure day-delta math for the Roadmap's drag-to-reschedule gesture, kept separate from the
 * Recharts shape renderer that calls it so it's directly unit-testable - Recharts' bars don't
 * render with real pixel dimensions under jsdom (no ResizeObserver-backed layout), so this couldn't
 * be exercised reliably through a full component render anyway. Returns null when the drag
 * resolves to no actual day change (e.g. a click, or a drag shorter than one day's worth of
 * pixels), so the caller knows not to fire an update for a no-op drag.
 */
export function computeRescheduledDate(
  originalDueDate: string,
  dragDeltaPx: number,
  pixelsPerDay: number,
): string | null {
  if (pixelsPerDay <= 0) return null
  const deltaDays = Math.round(dragDeltaPx / pixelsPerDay)
  if (deltaDays === 0) return null
  return new Date(new Date(originalDueDate).getTime() + deltaDays * DAY_MS).toISOString()
}

/** Turns a day-offset tick back into a calendar label appropriate for the zoom level. */
export function formatRoadmapTick(
  dayOffset: number,
  startDate: string,
  granularity: RoadmapGranularity,
): string {
  const date = new Date(new Date(startDate).getTime() + dayOffset * DAY_MS)
  if (granularity === 'week') return weekTickFormatter.format(date)
  if (granularity === 'month') return monthTickFormatter.format(date)
  const quarter = Math.floor(date.getMonth() / 3) + 1
  return `Q${quarter} ${date.getFullYear()}`
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
