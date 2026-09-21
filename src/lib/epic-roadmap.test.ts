import { describe, expect, it } from 'vitest'
import { buildEpicRoadmapData } from './epic-roadmap'
import type { EpicProgressReportEntry } from '@/types/task.types'

function makeEpic(overrides: Partial<EpicProgressReportEntry> = {}): EpicProgressReportEntry {
  return {
    epicId: 'e-1',
    issueKey: 'PRJ-1',
    title: 'Epic A',
    linkedIssueCount: 4,
    doneCount: 1,
    progress: 25,
    createdAt: '2026-01-01T00:00:00.000Z',
    dueDate: '2026-01-11T00:00:00.000Z',
    ...overrides,
  }
}

describe('buildEpicRoadmapData', () => {
  it('returns null when no epic has a dueDate', () => {
    expect(buildEpicRoadmapData([makeEpic({ dueDate: null })])).toBeNull()
  })

  it('excludes epics without a dueDate but keeps ones that have it', () => {
    const result = buildEpicRoadmapData([
      makeEpic({ epicId: 'e-1', dueDate: null }),
      makeEpic({ epicId: 'e-2', dueDate: '2026-01-11T00:00:00.000Z' }),
    ])
    expect(result?.rows).toHaveLength(1)
    expect(result?.rows[0]!.epicId).toBe('e-2')
  })

  it('computes offset/duration in days relative to the earliest createdAt', () => {
    const result = buildEpicRoadmapData([
      makeEpic({
        epicId: 'e-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        dueDate: '2026-01-11T00:00:00.000Z',
      }),
      makeEpic({
        epicId: 'e-2',
        createdAt: '2026-01-06T00:00:00.000Z',
        dueDate: '2026-01-21T00:00:00.000Z',
      }),
    ])
    expect(result).not.toBeNull()
    expect(result!.totalDays).toBe(20)
    const first = result!.rows.find((r) => r.epicId === 'e-1')!
    const second = result!.rows.find((r) => r.epicId === 'e-2')!
    expect(first).toMatchObject({ offsetDays: 0, durationDays: 10 })
    expect(second).toMatchObject({ offsetDays: 5, durationDays: 15 })
  })

  it('gives a same-day epic a minimum 1-day-wide bar rather than a zero-width one', () => {
    const result = buildEpicRoadmapData([
      makeEpic({
        epicId: 'e-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        dueDate: '2026-01-01T00:00:00.000Z',
      }),
    ])
    expect(result!.rows[0]!.durationDays).toBe(1)
  })
})
