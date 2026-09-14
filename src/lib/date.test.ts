import { describe, expect, it } from 'vitest'
import { assignLanes, getMonthGridWeeks } from './date'

describe('getMonthGridWeeks', () => {
  it('returns only Mon-Fri columns, in whole weeks covering the full month', () => {
    // September 2026: 1st is a Tuesday, 30th is a Wednesday.
    const weeks = getMonthGridWeeks(2026, 8)

    for (const week of weeks) {
      expect(week).toHaveLength(5)
    }
    // Every row starts on a Monday.
    for (const week of weeks) {
      expect(week[0]?.getDay()).toBe(1)
    }

    const allDays = weeks.flat()
    expect(
      allDays.some((d) => d.getFullYear() === 2026 && d.getMonth() === 8 && d.getDate() === 1),
    ).toBe(true)
    expect(
      allDays.some((d) => d.getFullYear() === 2026 && d.getMonth() === 8 && d.getDate() === 30),
    ).toBe(true)
  })

  it('includes leading/trailing days from adjacent months to complete the grid', () => {
    const weeks = getMonthGridWeeks(2026, 8)
    const firstDay = weeks[0]?.[0]
    const lastDay = weeks[weeks.length - 1]?.[4]

    // The 1st of September 2026 is a Tuesday, so the grid's first Monday is Aug 31.
    expect(firstDay?.getMonth()).toBe(7)
    expect(firstDay?.getDate()).toBe(31)
    // The 30th is a Wednesday, so the grid's last Friday is Oct 2.
    expect(lastDay?.getMonth()).toBe(9)
    expect(lastDay?.getDate()).toBe(2)
  })
})

describe('assignLanes', () => {
  it('gives non-overlapping items the same lane', () => {
    const items = [
      { startDate: '2026-01-01', endDate: '2026-01-05' },
      { startDate: '2026-01-06', endDate: '2026-01-10' },
    ]
    const result = assignLanes(items)
    expect(result.map((r) => r.lane)).toEqual([0, 0])
  })

  it('gives overlapping items different lanes', () => {
    const items = [
      { startDate: '2026-01-01', endDate: '2026-01-10' },
      { startDate: '2026-01-05', endDate: '2026-01-15' },
    ]
    const result = assignLanes(items)
    const lanes = result.map((r) => r.lane)
    expect(new Set(lanes).size).toBe(2)
  })

  it('reuses a freed lane once its occupant has ended', () => {
    const items = [
      { startDate: '2026-01-01', endDate: '2026-01-05' },
      { startDate: '2026-01-02', endDate: '2026-01-04' },
      { startDate: '2026-01-06', endDate: '2026-01-08' },
    ]
    const result = assignLanes(items)
    // The third item starts after the first has ended, so it can reuse lane 0.
    const third = result.find((r) => r.item.startDate === '2026-01-06')
    expect(third?.lane).toBe(0)
  })
})
