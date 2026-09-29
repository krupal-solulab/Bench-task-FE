import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ReleaseCalendarView } from '@/components/releases/ReleaseCalendarView'
import type { Release } from '@/types/release.types'

function makeRelease(overrides: Partial<Release> = {}): Release {
  return {
    id: 'r-1',
    name: 'v1.0.0',
    description: '',
    project: 'p-1',
    status: 'Unreleased',
    releaseDate: null,
    releasedAt: null,
    ownerId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('ReleaseCalendarView', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 15))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows an empty state when no release has a target or actual date this month', () => {
    render(<ReleaseCalendarView releases={[makeRelease({ releaseDate: null })]} />)
    expect(screen.getByText('No dated releases')).toBeInTheDocument()
  })

  it("plots a release on its target date when it hasn't shipped yet", () => {
    // The 12th is a Monday, inside the Mon-Fri grid this calendar renders.
    render(
      <ReleaseCalendarView releases={[makeRelease({ releaseDate: '2026-01-12T00:00:00.000Z' })]} />,
    )
    expect(screen.getByText('v1.0.0')).toBeInTheDocument()
  })

  it('prefers the actual ship date over the target date once a release has shipped', () => {
    // releaseDate falls in a different month entirely (out of the visible January grid), so the
    // marker can only be showing up here because releasedAt (in-month) was used instead.
    render(
      <ReleaseCalendarView
        releases={[
          makeRelease({
            releaseDate: '2025-12-01T00:00:00.000Z',
            releasedAt: '2026-01-20T00:00:00.000Z',
            status: 'Released',
          }),
        ]}
      />,
    )
    expect(screen.getByText('v1.0.0')).toBeInTheDocument()
  })
})
