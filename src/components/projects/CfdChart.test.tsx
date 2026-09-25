import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { CfdChart } from './CfdChart'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function renderChart() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return render(<CfdChart projectId="p-1" />, { wrapper: Wrapper })
}

describe('CfdChart', () => {
  it('shows an empty state when the project has no tasks yet (regression)', async () => {
    server.use(
      http.get(url('/projects/p-1/reports/cfd'), () =>
        HttpResponse.json({ success: true, data: [] }),
      ),
    )
    renderChart()

    expect(await screen.findByText('No tasks yet.')).toBeInTheDocument()
  })

  it('shows an empty state when every day has zero counts across all categories', async () => {
    server.use(
      http.get(url('/projects/p-1/reports/cfd'), () =>
        HttpResponse.json({
          success: true,
          data: [{ date: '2026-01-01', toDo: 0, inProgress: 0, done: 0 }],
        }),
      ),
    )
    renderChart()

    expect(await screen.findByText('No tasks yet.')).toBeInTheDocument()
  })

  it('renders the chart title once there is data to plot', async () => {
    server.use(
      http.get(url('/projects/p-1/reports/cfd'), () =>
        HttpResponse.json({
          success: true,
          data: [{ date: '2026-01-01', toDo: 2, inProgress: 1, done: 0 }],
        }),
      ),
    )
    renderChart()

    expect(await screen.findByText('Cumulative Flow Diagram')).toBeInTheDocument()
  })

  it('shows an error state when the request fails', async () => {
    server.use(
      http.get(url('/projects/p-1/reports/cfd'), () =>
        HttpResponse.json({ success: false, message: 'boom' }, { status: 500 }),
      ),
    )
    renderChart()

    expect(await screen.findByText('boom')).toBeInTheDocument()
  })
})
