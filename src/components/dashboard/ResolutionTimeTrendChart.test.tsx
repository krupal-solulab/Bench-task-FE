import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { ResolutionTimeTrendChart } from './ResolutionTimeTrendChart'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function renderChart() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return render(<ResolutionTimeTrendChart scope={{}} />, { wrapper: Wrapper })
}

describe('ResolutionTimeTrendChart', () => {
  it('shows an empty state when nothing was resolved in the period (regression)', async () => {
    server.use(
      http.get(url('/dashboard/resolution-time-trend'), () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              weekStart: '2026-01-01',
              avgResolutionHoursByPriority: { P1: null, P2: null, P3: null },
            },
          ],
        }),
      ),
    )
    renderChart()

    expect(await screen.findByText('No tasks resolved in this period.')).toBeInTheDocument()
  })

  it('renders the chart when at least one priority has data', async () => {
    server.use(
      http.get(url('/dashboard/resolution-time-trend'), () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              weekStart: '2026-01-01',
              avgResolutionHoursByPriority: { P1: 12, P2: null, P3: null },
            },
          ],
        }),
      ),
    )
    renderChart()

    expect(await screen.findByText('Resolution time trend')).toBeInTheDocument()
  })

  it('shows an error state when the request fails', async () => {
    server.use(
      http.get(url('/dashboard/resolution-time-trend'), () =>
        HttpResponse.json({ success: false, message: 'boom' }, { status: 500 }),
      ),
    )
    renderChart()

    expect(await screen.findByText('boom')).toBeInTheDocument()
  })
})
