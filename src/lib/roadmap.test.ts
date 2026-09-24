import { describe, expect, it } from 'vitest'
import { buildRoadmapChartData, colorForProject } from './roadmap'
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
