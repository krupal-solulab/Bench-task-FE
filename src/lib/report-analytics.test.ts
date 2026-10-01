import { describe, expect, it } from 'vitest'
import { detectCfdBottleneck } from './cfd-bottleneck'
import { rollingStats, rollingWindowFor } from './rolling-stats'
import type { CfdPoint } from '@/types/project.types'

function series(inProgress: number[], done: number[]): CfdPoint[] {
  return inProgress.map((wip, i) => ({
    date: `2026-09-${String(i + 1).padStart(2, '0')}`,
    toDo: 5,
    inProgress: wip,
    done: done[i] ?? 0,
  }))
}

describe('detectCfdBottleneck (Module 9 gap-closure)', () => {
  it('flags in-progress work piling up while completions stall, and finds where it started', () => {
    const wip = [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 5, 6, 7, 8, 8, 9]
    const done = [1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2]
    const result = detectCfdBottleneck(series(wip, done))
    expect(result).toMatchObject({
      startDate: '2026-09-11',
      endDate: '2026-09-16',
      wipBefore: 2,
      completedRecently: 1, // done went 1 -> 2 within the last 7 days
    })
    expect(result!.wipNow).toBeGreaterThan(6)
  })

  it('does not flag a steady flow', () => {
    const wip = Array.from({ length: 16 }, () => 3)
    const done = Array.from({ length: 16 }, (_, i) => i)
    expect(detectCfdBottleneck(series(wip, done))).toBeNull()
  })

  it('does not flag growth that completions are keeping up with', () => {
    const wip = [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 5, 6, 7, 8, 8, 9]
    const done = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 6, 9, 12, 15, 18]
    expect(detectCfdBottleneck(series(wip, done))).toBeNull()
  })

  it('needs at least two weeks of data', () => {
    expect(detectCfdBottleneck(series([1, 9, 9], [0, 0, 0]))).toBeNull()
  })
})

describe('rollingStats (Module 9 gap-closure)', () => {
  it('computes a trailing mean with a +/-1 standard deviation band floored at zero', () => {
    const stats = rollingStats([10, 20, 30, 40], 2)
    expect(stats.map((s) => s.mean)).toEqual([10, 15, 25, 35])
    expect(stats[1]).toEqual({ mean: 15, low: 10, high: 20 })
    expect(rollingStats([1, 9], 2)[1]!.low).toBe(1)
    expect(rollingStats([0, 10], 2)[1]!.low).toBe(0)
  })

  it('sizes the window to the data (3 to 10 points)', () => {
    expect(rollingWindowFor(4)).toBe(3)
    expect(rollingWindowFor(30)).toBe(6)
    expect(rollingWindowFor(500)).toBe(10)
  })
})
