import { beforeEach, describe, expect, it } from 'vitest'
import { addRecentlyViewed, getRecentlyViewed } from './useRecentlyViewed'

describe('useRecentlyViewed', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns an empty array when nothing has been viewed yet (regression)', () => {
    expect(getRecentlyViewed()).toEqual([])
  })

  it('records a viewed item and returns it most-recent-first', () => {
    addRecentlyViewed({ id: 't-1', type: 'task', label: 'Task One', path: '/tasks/t-1' })
    addRecentlyViewed({ id: 'p-1', type: 'project', label: 'Project One', path: '/projects/p-1' })

    const recents = getRecentlyViewed()
    expect(recents).toHaveLength(2)
    expect(recents[0]).toMatchObject({ id: 'p-1', type: 'project' })
    expect(recents[1]).toMatchObject({ id: 't-1', type: 'task' })
  })

  it('moves an already-viewed item to the front instead of duplicating it', () => {
    addRecentlyViewed({ id: 't-1', type: 'task', label: 'Task One', path: '/tasks/t-1' })
    addRecentlyViewed({ id: 't-2', type: 'task', label: 'Task Two', path: '/tasks/t-2' })
    addRecentlyViewed({ id: 't-1', type: 'task', label: 'Task One', path: '/tasks/t-1' })

    const recents = getRecentlyViewed()
    expect(recents).toHaveLength(2)
    expect(recents[0]?.id).toBe('t-1')
  })

  it('caps the list at 10 items, dropping the oldest', () => {
    for (let i = 0; i < 12; i++) {
      addRecentlyViewed({ id: `t-${i}`, type: 'task', label: `Task ${i}`, path: `/tasks/t-${i}` })
    }
    const recents = getRecentlyViewed()
    expect(recents).toHaveLength(10)
    expect(recents[0]?.id).toBe('t-11')
    expect(recents.some((r) => r.id === 't-0')).toBe(false)
  })

  it('returns an empty array rather than throwing when localStorage holds malformed JSON', () => {
    window.localStorage.setItem('recently-viewed', '{not valid json')
    expect(getRecentlyViewed()).toEqual([])
  })
})
