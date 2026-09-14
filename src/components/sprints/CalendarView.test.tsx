import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CalendarView } from '@/components/sprints/CalendarView'
import type { Sprint } from '@/types/sprint.types'

function makeSprint(overrides: Partial<Sprint> = {}): Sprint {
  return {
    id: 's-1',
    name: 'Sprint 12',
    goal: '',
    project: 'p-1',
    status: 'Active',
    startDate: '2026-01-05',
    endDate: '2026-01-16',
    startedAt: '2026-01-05T00:00:00.000Z',
    completedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('CalendarView', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 15))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders a bar for a sprint whose range falls in the current month', () => {
    render(
      <MemoryRouter>
        <CalendarView sprints={[makeSprint()]} projectId="p-1" />
      </MemoryRouter>,
    )

    expect(screen.getAllByText('Sprint 12').length).toBeGreaterThan(0)
  })

  it('shows an empty state when no sprint overlaps the visible month', () => {
    render(
      <MemoryRouter>
        <CalendarView
          sprints={[makeSprint({ startDate: '2025-06-01', endDate: '2025-06-14' })]}
          projectId="p-1"
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('No sprints this month')).toBeInTheDocument()
  })
})
