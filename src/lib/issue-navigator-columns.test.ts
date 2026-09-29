import { beforeEach, describe, expect, it } from 'vitest'
import { readColumnLayout, resolveColumnOrder, writeColumnLayout } from './issue-navigator-columns'

describe('resolveColumnOrder', () => {
  it('returns the known keys unchanged when nothing is saved', () => {
    expect(resolveColumnOrder(null, ['a', 'b', 'c'])).toEqual(['a', 'b', 'c'])
  })

  it('preserves a saved order for keys that still exist', () => {
    expect(resolveColumnOrder(['c', 'a', 'b'], ['a', 'b', 'c'])).toEqual(['c', 'a', 'b'])
  })

  it('drops a saved key that no longer exists', () => {
    expect(resolveColumnOrder(['x', 'a', 'b'], ['a', 'b'])).toEqual(['a', 'b'])
  })

  it('appends a newly-added column that was never saved', () => {
    expect(resolveColumnOrder(['b', 'a'], ['a', 'b', 'c'])).toEqual(['b', 'a', 'c'])
  })
})

describe('readColumnLayout / writeColumnLayout', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('round-trips a written layout', () => {
    writeColumnLayout({ order: ['a', 'b'], widths: { a: 120 } })
    expect(readColumnLayout()).toEqual({ order: ['a', 'b'], widths: { a: 120 } })
  })

  it('returns null when nothing has been saved', () => {
    expect(readColumnLayout()).toBeNull()
  })

  it('returns null for malformed stored JSON rather than throwing', () => {
    window.localStorage.setItem('issue-navigator-columns-v1', 'not json')
    expect(readColumnLayout()).toBeNull()
  })

  it('returns null for a validly-parsed but wrong-shaped value', () => {
    window.localStorage.setItem('issue-navigator-columns-v1', JSON.stringify({ foo: 'bar' }))
    expect(readColumnLayout()).toBeNull()
  })
})
