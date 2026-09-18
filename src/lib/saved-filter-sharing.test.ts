import { describe, expect, it } from 'vitest'
import { canDeleteSavedFilter, describeSharedBadge } from './saved-filter-sharing'
import type { SavedFilter } from '@/types/saved-filter.types'

function makeFilter(overrides: Partial<SavedFilter> = {}): SavedFilter {
  return {
    id: 'sf-1',
    name: 'A filter',
    scope: 'project',
    projectId: 'p-1',
    visibility: 'private',
    owner: 'u-owner',
    query: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('canDeleteSavedFilter', () => {
  it('is true for the owner', () => {
    expect(canDeleteSavedFilter(makeFilter({ owner: 'u-me' }), 'u-me')).toBe(true)
  })

  it('is false for a non-owner, even on a shared filter', () => {
    expect(
      canDeleteSavedFilter(makeFilter({ owner: 'u-me', visibility: 'shared' }), 'u-other'),
    ).toBe(false)
  })

  it('is false when there is no current user', () => {
    expect(canDeleteSavedFilter(makeFilter({ owner: 'u-me' }), undefined)).toBe(false)
  })
})

describe('describeSharedBadge', () => {
  it('returns null for a private filter (regression: every existing filter)', () => {
    expect(describeSharedBadge(makeFilter({ visibility: 'private' }), 'u-me', {})).toBeNull()
  })

  it('returns "(shared)" for the caller\'s own shared filter', () => {
    expect(
      describeSharedBadge(makeFilter({ visibility: 'shared', owner: 'u-me' }), 'u-me', {}),
    ).toBe('(shared)')
  })

  it("resolves the owner's name from memberNameById for another user's shared filter", () => {
    expect(
      describeSharedBadge(makeFilter({ visibility: 'shared', owner: 'u-other' }), 'u-me', {
        'u-other': 'Other Dev',
      }),
    ).toBe('(shared by Other Dev)')
  })

  it('falls back to a generic label when the owner is not in memberNameById', () => {
    expect(
      describeSharedBadge(makeFilter({ visibility: 'shared', owner: 'u-other' }), 'u-me', {}),
    ).toBe('(shared by a teammate)')
  })
})
