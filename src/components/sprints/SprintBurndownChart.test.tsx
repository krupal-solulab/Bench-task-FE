import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { SprintBurndownChart } from './SprintBurndownChart'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function renderChart(sprintId: string | undefined) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return render(<SprintBurndownChart projectId="p-1" sprintId={sprintId} />, { wrapper: Wrapper })
}

describe('SprintBurndownChart', () => {
  it('shows a "select a sprint" empty state when no sprint is selected (regression)', async () => {
    renderChart(undefined)

    expect(await screen.findByText('Select a sprint to view its burndown.')).toBeInTheDocument()
  })

  it('shows a "not started yet" empty state when the sprint has no points to plot', async () => {
    server.use(
      http.get(url('/projects/p-1/sprints/s-1/burndown'), () =>
        HttpResponse.json({ success: true, data: { points: [], hasStoryPoints: false } }),
      ),
    )
    renderChart('s-1')

    expect(await screen.findByText("This sprint hasn't started yet.")).toBeInTheDocument()
  })

  it('renders the points-based description when the sprint has story points', async () => {
    server.use(
      http.get(url('/projects/p-1/sprints/s-1/burndown'), () =>
        HttpResponse.json({
          success: true,
          data: {
            hasStoryPoints: true,
            points: [
              {
                date: '2026-01-01',
                remainingPoints: 8,
                remainingCount: 2,
                idealRemainingPoints: 8,
                idealRemainingCount: 2,
              },
              {
                date: '2026-01-02',
                remainingPoints: 5,
                remainingCount: 1,
                idealRemainingPoints: 4,
                idealRemainingCount: 1,
              },
            ],
          },
        }),
      ),
    )
    renderChart('s-1')

    expect(await screen.findByText('Burndown')).toBeInTheDocument()
    expect(await screen.findByText('Remaining story points vs. ideal')).toBeInTheDocument()
  })

  it('falls back to an issue-count description when the sprint has no story points', async () => {
    server.use(
      http.get(url('/projects/p-1/sprints/s-1/burndown'), () =>
        HttpResponse.json({
          success: true,
          data: {
            hasStoryPoints: false,
            points: [
              {
                date: '2026-01-01',
                remainingPoints: 0,
                remainingCount: 2,
                idealRemainingPoints: 0,
                idealRemainingCount: 2,
              },
            ],
          },
        }),
      ),
    )
    renderChart('s-1')

    expect(await screen.findByText('Remaining issues vs. ideal')).toBeInTheDocument()
  })

  it('shows an error state when the request fails', async () => {
    server.use(
      http.get(url('/projects/p-1/sprints/s-1/burndown'), () =>
        HttpResponse.json({ success: false, message: 'boom' }, { status: 500 }),
      ),
    )
    renderChart('s-1')

    expect(await screen.findByText('boom')).toBeInTheDocument()
  })
})
