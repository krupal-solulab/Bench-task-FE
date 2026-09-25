import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { CycleTimeChart } from './CycleTimeChart'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function renderChart() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return render(<CycleTimeChart projectId="p-1" />, { wrapper: Wrapper })
}

describe('CycleTimeChart', () => {
  it('shows an empty state when no issue was completed in the period (regression)', async () => {
    server.use(
      http.get(url('/projects/p-1/reports/cycle-time'), () =>
        HttpResponse.json({
          success: true,
          data: { points: [], averageLeadTimeHours: null, averageCycleTimeHours: null },
        }),
      ),
    )
    renderChart()

    expect(await screen.findByText('No issues completed in this period.')).toBeInTheDocument()
  })

  it('renders the chart title once there is data to plot', async () => {
    server.use(
      http.get(url('/projects/p-1/reports/cycle-time'), () =>
        HttpResponse.json({
          success: true,
          data: {
            points: [
              {
                taskId: 't-1',
                issueKey: 'PRJ-1',
                title: 'Ship it',
                completedAt: '2026-01-05T00:00:00.000Z',
                leadTimeHours: 48,
                cycleTimeHours: 24,
              },
            ],
            averageLeadTimeHours: 48,
            averageCycleTimeHours: 24,
          },
        }),
      ),
    )
    renderChart()

    expect(await screen.findByText('Control Chart')).toBeInTheDocument()
  })

  it('shows an error state when the request fails', async () => {
    server.use(
      http.get(url('/projects/p-1/reports/cycle-time'), () =>
        HttpResponse.json({ success: false, message: 'boom' }, { status: 500 }),
      ),
    )
    renderChart()

    expect(await screen.findByText('boom')).toBeInTheDocument()
  })
})
