import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { SprintVelocityChart } from './SprintVelocityChart'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function renderChart() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return render(<SprintVelocityChart projectId="p-1" limit={5} />, { wrapper: Wrapper })
}

describe('SprintVelocityChart', () => {
  it('shows an empty state when there are no completed sprints yet (regression)', async () => {
    server.use(
      http.get(url('/projects/p-1/sprints/velocity'), () =>
        HttpResponse.json({ success: true, data: [] }),
      ),
    )
    renderChart()

    expect(await screen.findByText('No completed sprints yet.')).toBeInTheDocument()
  })

  it('renders the chart title and a points-based description when a sprint has completed points', async () => {
    server.use(
      http.get(url('/projects/p-1/sprints/velocity'), () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              sprintId: 's-1',
              name: 'Sprint 1',
              completedAt: '2026-01-14T00:00:00.000Z',
              completedPoints: 13,
              completedCount: 4,
            },
          ],
        }),
      ),
    )
    renderChart()

    expect(await screen.findByText('Velocity')).toBeInTheDocument()
    expect(
      await screen.findByText('Story points completed per sprint, last 5 sprints'),
    ).toBeInTheDocument()
  })

  it('falls back to an issue-count description when no sprint in range used story points', async () => {
    server.use(
      http.get(url('/projects/p-1/sprints/velocity'), () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              sprintId: 's-1',
              name: 'Sprint 1',
              completedAt: '2026-01-14T00:00:00.000Z',
              completedPoints: 0,
              completedCount: 3,
            },
          ],
        }),
      ),
    )
    renderChart()

    expect(
      await screen.findByText('Issues completed per sprint, last 5 sprints'),
    ).toBeInTheDocument()
  })

  it('shows an error state when the request fails', async () => {
    server.use(
      http.get(url('/projects/p-1/sprints/velocity'), () =>
        HttpResponse.json({ success: false, message: 'boom' }, { status: 500 }),
      ),
    )
    renderChart()

    expect(await screen.findByText('boom')).toBeInTheDocument()
  })
})
