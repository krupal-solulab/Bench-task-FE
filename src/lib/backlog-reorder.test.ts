import { describe, expect, it } from 'vitest'
import { computeReorderNeighbors } from './backlog-reorder'

describe('computeReorderNeighbors', () => {
  it('returns the immediate before/after neighbors of the moved item', () => {
    expect(computeReorderNeighbors(['a', 'b', 'c', 'd'], 'c')).toEqual({
      beforeTaskId: 'b',
      afterTaskId: 'd',
    })
  })

  it('omits beforeTaskId when the moved item is now first', () => {
    expect(computeReorderNeighbors(['a', 'b', 'c'], 'a')).toEqual({
      beforeTaskId: undefined,
      afterTaskId: 'b',
    })
  })

  it('omits afterTaskId when the moved item is now last', () => {
    expect(computeReorderNeighbors(['a', 'b', 'c'], 'c')).toEqual({
      beforeTaskId: 'b',
      afterTaskId: undefined,
    })
  })

  it('returns an empty object when the moved item is the only item', () => {
    expect(computeReorderNeighbors(['a'], 'a')).toEqual({
      beforeTaskId: undefined,
      afterTaskId: undefined,
    })
  })

  it('returns an empty object when the active id is not found', () => {
    expect(computeReorderNeighbors(['a', 'b'], 'missing')).toEqual({})
  })
})
