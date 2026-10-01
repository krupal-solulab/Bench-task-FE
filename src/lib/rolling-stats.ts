export interface RollingStat {
  mean: number
  /** mean - 1 standard deviation, floored at 0 (a cycle time can't be negative). */
  low: number
  high: number
}

/**
 * Module 9 gap-closure: the Control Chart's rolling-average band - for each value (already sorted
 * by completion date), the mean and +/-1 standard deviation of the trailing `window` values
 * (fewer at the very start). Jira's control chart shows the same idea: the line is "typical
 * cycle time right now", the band is how much it normally varies, and points outside the band
 * are the outliers worth a look.
 */
export function rollingStats(values: number[], window: number): RollingStat[] {
  const size = Math.max(1, window)
  return values.map((_, index) => {
    const slice = values.slice(Math.max(0, index - size + 1), index + 1)
    const mean = slice.reduce((sum, v) => sum + v, 0) / slice.length
    const variance = slice.reduce((sum, v) => sum + (v - mean) ** 2, 0) / slice.length
    const sd = Math.sqrt(variance)
    const round = (n: number) => Math.round(n * 10) / 10
    return { mean: round(mean), low: round(Math.max(0, mean - sd)), high: round(mean + sd) }
  })
}

/** A window that adapts to how much data there is: ~20% of the points, between 3 and 10. */
export function rollingWindowFor(count: number): number {
  return Math.min(10, Math.max(3, Math.round(count * 0.2)))
}
