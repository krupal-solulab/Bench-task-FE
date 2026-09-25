import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { SprintRetrospective } from './SprintRetrospective'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function renderPanel(sprintId: string | undefined) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return render(<SprintRetrospective projectId="p-1" sprintId={sprintId} />, { wrapper: Wrapper })
}

function mockSprint(status: 'Active' | 'Completed') {
  server.use(
    http.get(url('/projects/p-1/sprints/s-1'), () =>
      HttpResponse.json({
        success: true,
        data: {
          id: 's-1',
          name: 'Sprint 1',
          goal: '',
          project: 'p-1',
          status,
          startDate: '2026-01-01',
          endDate: '2026-01-14',
          startedAt: '2026-01-01T00:00:00.000Z',
          completedAt: status === 'Completed' ? '2026-01-14T00:00:00.000Z' : null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      }),
    ),
  )
}

describe('SprintRetrospective', () => {
  it('shows a "select a sprint" empty state when no sprint is selected (regression)', async () => {
    renderPanel(undefined)

    expect(
      await screen.findByText('Select a sprint to view its retrospective.'),
    ).toBeInTheDocument()
  })

  it('shows a "not started yet" empty state when there is no planned or added scope', async () => {
    mockSprint('Active')
    server.use(
      http.get(url('/projects/p-1/sprints/s-1/retrospective'), () =>
        HttpResponse.json({
          success: true,
          data: {
            plannedCount: 0,
            plannedPoints: 0,
            addedCount: 0,
            addedPoints: 0,
            completedCount: 0,
            completedPoints: 0,
            removedCount: 0,
            removedPoints: 0,
            carryoverCount: 0,
            carryoverPoints: 0,
            completionRatePercent: null,
          },
        }),
      ),
    )
    renderPanel('s-1')

    expect(await screen.findByText("This sprint hasn't started yet.")).toBeInTheDocument()
  })

  it('labels remaining work as "Still remaining" for an Active sprint', async () => {
    mockSprint('Active')
    server.use(
      http.get(url('/projects/p-1/sprints/s-1/retrospective'), () =>
        HttpResponse.json({
          success: true,
          data: {
            plannedCount: 2,
            plannedPoints: 8,
            addedCount: 0,
            addedPoints: 0,
            completedCount: 1,
            completedPoints: 3,
            removedCount: 0,
            removedPoints: 0,
            carryoverCount: 1,
            carryoverPoints: 5,
            completionRatePercent: 50,
          },
        }),
      ),
    )
    renderPanel('s-1')

    expect(await screen.findByText('Still remaining')).toBeInTheDocument()
    expect(screen.getByText('50% complete')).toBeInTheDocument()
    expect(screen.getByText('2 (8 pts)')).toBeInTheDocument()
  })

  it('labels remaining work as "Carried over" for a Completed sprint', async () => {
    mockSprint('Completed')
    server.use(
      http.get(url('/projects/p-1/sprints/s-1/retrospective'), () =>
        HttpResponse.json({
          success: true,
          data: {
            plannedCount: 2,
            plannedPoints: 8,
            addedCount: 0,
            addedPoints: 0,
            completedCount: 1,
            completedPoints: 3,
            removedCount: 0,
            removedPoints: 0,
            carryoverCount: 1,
            carryoverPoints: 5,
            completionRatePercent: 50,
          },
        }),
      ),
    )
    renderPanel('s-1')

    expect(await screen.findByText('Carried over')).toBeInTheDocument()
  })

  it('shows an error state when the request fails', async () => {
    mockSprint('Active')
    server.use(
      http.get(url('/projects/p-1/sprints/s-1/retrospective'), () =>
        HttpResponse.json({ success: false, message: 'boom' }, { status: 500 }),
      ),
    )
    renderPanel('s-1')

    expect(await screen.findByText('boom')).toBeInTheDocument()
  })
})
