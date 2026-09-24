import { describe, expect, it } from 'vitest'
import { toggleReleaseSelection } from './release-multi-select'

describe('toggleReleaseSelection', () => {
  it('adds an id not already selected', () => {
    expect(toggleReleaseSelection([], 'r-1')).toEqual(['r-1'])
    expect(toggleReleaseSelection(['r-2'], 'r-1')).toEqual(['r-2', 'r-1'])
  })

  it('removes an id already selected', () => {
    expect(toggleReleaseSelection(['r-1'], 'r-1')).toEqual([])
    expect(toggleReleaseSelection(['r-1', 'r-2'], 'r-1')).toEqual(['r-2'])
  })
})
