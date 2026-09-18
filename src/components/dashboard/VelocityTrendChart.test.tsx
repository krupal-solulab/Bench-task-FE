import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { VelocityTrendChart } from './VelocityTrendChart'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function renderChart() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return render(<VelocityTrendChart scope={{}} />, { wrapper: Wrapper })
}

describe('VelocityTrendChart', () => {
  it('shows an empty state when there is no completed work (regression)', async () => {
    server.use(
      http.get(url('/dashboard/velocity-trend'), () =>
        HttpResponse.json({ success: true, data: { points: [], hasStoryPoints: false } }),
      ),
    )
    renderChart()

    expect(await screen.findByText('No completed work in this period.')).toBeInTheDocument()
  })

  it('shows a points-based description when story points were used', async () => {
    server.use(
      http.get(url('/dashboard/velocity-trend'), () =>
        HttpResponse.json({
          success: true,
          data: {
            hasStoryPoints: true,
            points: [{ weekStart: '2026-01-01', completedPoints: 8, completedCount: 2 }],
          },
        }),
      ),
    )
    renderChart()

    expect(await screen.findByText('Velocity trend')).toBeInTheDocument()
    expect(
      await screen.findByText('Story points completed per week, last 8 weeks'),
    ).toBeInTheDocument()
  })

  it('falls back to an issue-count description when no week used story points', async () => {
    server.use(
      http.get(url('/dashboard/velocity-trend'), () =>
        HttpResponse.json({
          success: true,
          data: {
            hasStoryPoints: false,
            points: [{ weekStart: '2026-01-01', completedPoints: 0, completedCount: 3 }],
          },
        }),
      ),
    )
    renderChart()

    expect(await screen.findByText('Issues completed per week, last 8 weeks')).toBeInTheDocument()
  })

  it('shows an error state when the request fails', async () => {
    server.use(
      http.get(url('/dashboard/velocity-trend'), () =>
        HttpResponse.json({ success: false, message: 'boom' }, { status: 500 }),
      ),
    )
    renderChart()

    expect(await screen.findByText('boom')).toBeInTheDocument()
  })
})
