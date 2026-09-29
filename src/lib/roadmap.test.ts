import { describe, expect, it } from 'vitest'
import {
  buildRoadmapChartData,
  buildRoadmapTicks,
  colorForProject,
  computeRescheduledDate,
  formatRoadmapTick,
} from './roadmap'
import type { RoadmapEpic } from '@/types/issue-link.types'

function makeEpic(overrides: Partial<RoadmapEpic> = {}): RoadmapEpic {
  return {
    epicId: 'e-1',
    issueKey: 'PRJ-1',
    title: 'Epic A',
    statusCategory: 'To Do',
    createdAt: '2026-01-01T00:00:00.000Z',
    dueDate: '2026-01-11T00:00:00.000Z',
    project: { id: 'p-1', name: 'Project A' },
    linkedIssueCount: 4,
    doneCount: 1,
    progress: 25,
    blockedByExternal: [],
    ...overrides,
  }
}

describe('buildRoadmapChartData', () => {
  it('returns null when no epic has a dueDate', () => {
    expect(buildRoadmapChartData([makeEpic({ dueDate: null })])).toBeNull()
  })

  it('enriches each row with its project and blocking warnings', () => {
    const result = buildRoadmapChartData([
      makeEpic({
        epicId: 'e-1',
        project: { id: 'p-1', name: 'Project A' },
        blockedByExternal: [
          { epicId: 'e-2', issueKey: 'OTH-1', title: 'Blocker', projectName: 'Project B' },
        ],
      }),
    ])
    expect(result?.rows[0]).toMatchObject({
      epicId: 'e-1',
      projectId: 'p-1',
      projectName: 'Project A',
      blockedByExternal: [{ epicId: 'e-2', projectName: 'Project B' }],
    })
  })

  it('preserves the underlying offset/duration day math', () => {
    const result = buildRoadmapChartData([
      makeEpic({
        epicId: 'e-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        dueDate: '2026-01-11T00:00:00.000Z',
      }),
    ])
    expect(result?.rows[0]).toMatchObject({ offsetDays: 0, durationDays: 10 })
  })

  it('anchors startDate to the earliest epic start, for zoom-level tick labeling', () => {
    const result = buildRoadmapChartData([
      makeEpic({ createdAt: '2026-03-01T00:00:00.000Z', dueDate: '2026-03-11T00:00:00.000Z' }),
    ])
    expect(result?.startDate).toBe('2026-03-01T00:00:00.000Z')
  })
})

describe('buildRoadmapTicks', () => {
  it('places a tick every 7 days at week zoom, plus a final tick at the true end', () => {
    expect(buildRoadmapTicks(20, 'week')).toEqual([0, 7, 14, 20])
  })

  it('places a tick every 30 days at month zoom', () => {
    expect(buildRoadmapTicks(65, 'month')).toEqual([0, 30, 60, 65])
  })

  it('never duplicates the final tick when totalDays already lands on a bucket boundary', () => {
    expect(buildRoadmapTicks(14, 'week')).toEqual([0, 7, 14])
  })
})

describe('formatRoadmapTick', () => {
  it('formats a week-zoom tick as a short date', () => {
    expect(formatRoadmapTick(7, '2026-01-01T00:00:00.000Z', 'week')).toBe('Jan 8')
  })

  it('formats a month-zoom tick as month + year', () => {
    expect(formatRoadmapTick(45, '2026-01-01T00:00:00.000Z', 'month')).toBe('Feb 2026')
  })

  it('formats a quarter-zoom tick as Q<n> year', () => {
    expect(formatRoadmapTick(100, '2026-01-01T00:00:00.000Z', 'quarter')).toBe('Q2 2026')
  })
})

describe('computeRescheduledDate', () => {
  const pixelsPerDay = 10

  it('pushes the due date forward when dragged right', () => {
    const result = computeRescheduledDate('2026-01-10T00:00:00.000Z', 35, pixelsPerDay)
    expect(result).toBe('2026-01-14T00:00:00.000Z')
  })

  it('pulls the due date back when dragged left', () => {
    const result = computeRescheduledDate('2026-01-10T00:00:00.000Z', -20, pixelsPerDay)
    expect(result).toBe('2026-01-08T00:00:00.000Z')
  })

  it('returns null for a drag too short to resolve to a whole day (a click, not a drag)', () => {
    expect(computeRescheduledDate('2026-01-10T00:00:00.000Z', 4, pixelsPerDay)).toBeNull()
  })

  it('returns null when the bar has no real width to derive a scale from', () => {
    expect(computeRescheduledDate('2026-01-10T00:00:00.000Z', 50, 0)).toBeNull()
  })
})

describe('colorForProject', () => {
  it('assigns a stable color per project based on its position in the list', () => {
    const ids = ['p-1', 'p-2', 'p-3']
    expect(colorForProject('p-1', ids)).toBe(colorForProject('p-1', ids))
    expect(colorForProject('p-1', ids)).not.toBe(colorForProject('p-2', ids))
  })

  it('cycles through the palette once there are more projects than colors', () => {
    const many = Array.from({ length: 10 }, (_, i) => `p-${i}`)
    expect(colorForProject('p-0', many)).toBe(colorForProject('p-8', many))
  })
})
