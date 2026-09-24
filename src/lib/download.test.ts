import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadTextFile } from './download'

describe('downloadTextFile', () => {
  let createObjectURL: ReturnType<typeof vi.fn>
  let revokeObjectURL: ReturnType<typeof vi.fn>
  let clickSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    createObjectURL = vi.fn(() => 'blob:mock-url')
    revokeObjectURL = vi.fn()
    // jsdom doesn't implement these - stub them for this test only.
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL
    URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL
    clickSpy = vi.fn()
    HTMLAnchorElement.prototype.click = clickSpy
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates an object URL from the given content and revokes it afterward', () => {
    downloadTextFile('tasks.csv', 'a,b\n1,2', 'text/csv')

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const [blob] = createObjectURL.mock.calls[0] as [Blob]
    expect(blob.type).toBe('text/csv')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('clicks a synthetic anchor with the given filename and object URL', () => {
    downloadTextFile('backup.json', '{}', 'application/json')

    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('revokes the object URL even if the click throws', () => {
    clickSpy.mockImplementation(() => {
      throw new Error('boom')
    })

    expect(() => downloadTextFile('tasks.csv', 'a,b', 'text/csv')).toThrow('boom')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })
})
