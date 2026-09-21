import type { EpicProgressReportEntry } from '@/types/task.types'

export interface EpicRoadmapRow {
  epicId: string
  title: string
  progress: number
  // Recharts' stacked-bar Gantt trick: an invisible bar from the axis start to this row's own
  // start (offsetDays), then a visible bar spanning its own duration (durationDays).
  offsetDays: number
  durationDays: number
}

export interface EpicRoadmapData {
  rows: EpicRoadmapRow[]
  totalDays: number
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Builds the row data for a horizontal "Gantt-lite" epic timeline (BRD 6.4) - a bar per epic
 * spanning createdAt -> dueDate on a shared day-offset axis. Pure and side-effect-free so it's
 * directly unit-testable without rendering a chart. Epics without a dueDate are excluded (there's
 * no target to plot); returns null when nothing is plottable at all.
 */
export function buildEpicRoadmapData(epics: EpicProgressReportEntry[]): EpicRoadmapData | null {
  const plottable = epics.filter(
    (e): e is EpicProgressReportEntry & { dueDate: string; createdAt: string } =>
      !!e.dueDate && !!e.createdAt,
  )
  if (plottable.length === 0) return null

  const startTimes = plottable.map((e) => new Date(e.createdAt).getTime())
  const endTimes = plottable.map((e) => new Date(e.dueDate).getTime())
  const minTime = Math.min(...startTimes)
  const maxTime = Math.max(...endTimes)
  const totalDays = Math.max(1, Math.round((maxTime - minTime) / DAY_MS))

  const rows = plottable.map((epic, i) => {
    const offsetDays = Math.round((startTimes[i]! - minTime) / DAY_MS)
    const durationDays = Math.max(1, Math.round((endTimes[i]! - startTimes[i]!) / DAY_MS))
    return {
      epicId: epic.epicId,
      title: epic.title,
      progress: epic.progress,
      offsetDays,
      durationDays,
    }
  })

  return { rows, totalDays }
}
