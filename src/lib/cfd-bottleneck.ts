import type { CfdPoint } from '@/types/project.types'

/** How many days at each end of the window are averaged to compare "before" vs "now". */
const EDGE_DAYS = 7
/** In-progress work must grow by at least this factor (and MIN_WIP_GROWTH items) to count. */
const GROWTH_FACTOR = 1.5
const MIN_WIP_GROWTH = 2

export interface CfdBottleneck {
  /** First day of the stretch where in-progress work stayed above its starting level. */
  startDate: string
  endDate: string
  wipBefore: number
  wipNow: number
  /** Issues completed over the last EDGE_DAYS days. */
  completedRecently: number
}

const average = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length

/**
 * Module 9 gap-closure: the CFD's bottleneck highlight. A bottleneck shows on a CFD as the
 * "In Progress" band widening - work being started faster than it's finished. Flagged when the
 * average in-progress count over the last week is at least 1.5x (and 2+ issues more than) the
 * first week's, AND recent completions didn't keep pace with that growth. Deliberately a simple,
 * explainable rule over the 3 status categories the CFD already plots - not a per-status
 * statistical model.
 */
export function detectCfdBottleneck(points: CfdPoint[]): CfdBottleneck | null {
  if (points.length < EDGE_DAYS * 2) return null

  const wip = points.map((p) => p.inProgress)
  const wipBefore = average(wip.slice(0, EDGE_DAYS))
  const wipNow = average(wip.slice(-EDGE_DAYS))
  const grewEnough = wipNow - wipBefore >= MIN_WIP_GROWTH && wipNow >= wipBefore * GROWTH_FACTOR
  if (!grewEnough) return null

  const last = points[points.length - 1]!
  const weekAgo = points[points.length - 1 - EDGE_DAYS]!
  const completedRecently = Math.max(0, last.done - weekAgo.done)
  if (completedRecently >= wipNow - wipBefore) return null

  // Walk back from the end while in-progress work stays above the starting level - that stretch
  // is what the chart highlights.
  const threshold = wipBefore + MIN_WIP_GROWTH / 2
  let start = points.length - 1
  while (start > 0 && points[start - 1]!.inProgress > threshold) start -= 1

  return {
    startDate: points[start]!.date,
    endDate: last.date,
    wipBefore: Math.round(wipBefore * 10) / 10,
    wipNow: Math.round(wipNow * 10) / 10,
    completedRecently,
  }
}
