import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { SlaComplianceChart } from './SlaComplianceChart'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function renderChart() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return render(<SlaComplianceChart scope={{}} />, { wrapper: Wrapper })
}

describe('SlaComplianceChart', () => {
  it('shows an empty state when there are no tasks in the period (regression)', async () => {
    server.use(
      http.get(url('/dashboard/sla-compliance'), () =>
        HttpResponse.json({
          success: true,
          data: [
            { priority: 'P1', total: 0, compliant: 0, breached: 0, avgResolutionHours: null },
            { priority: 'P2', total: 0, compliant: 0, breached: 0, avgResolutionHours: null },
            { priority: 'P3', total: 0, compliant: 0, breached: 0, avgResolutionHours: null },
          ],
        }),
      ),
    )
    renderChart()

    expect(await screen.findByText('No tasks in this period.')).toBeInTheDocument()
  })

  it('renders the chart and avg-resolution-hours summary when there is data', async () => {
    server.use(
      http.get(url('/dashboard/sla-compliance'), () =>
        HttpResponse.json({
          success: true,
          data: [
            { priority: 'P1', total: 2, compliant: 1, breached: 1, avgResolutionHours: 10 },
            { priority: 'P2', total: 0, compliant: 0, breached: 0, avgResolutionHours: null },
            { priority: 'P3', total: 0, compliant: 0, breached: 0, avgResolutionHours: null },
          ],
        }),
      ),
    )
    renderChart()

    expect(await screen.findByText('SLA compliance')).toBeInTheDocument()
    expect(await screen.findByText('10h')).toBeInTheDocument()
  })

  it('shows an error state when the request fails', async () => {
    server.use(
      http.get(url('/dashboard/sla-compliance'), () =>
        HttpResponse.json({ success: false, message: 'boom' }, { status: 500 }),
      ),
    )
    renderChart()

    expect(await screen.findByText('boom')).toBeInTheDocument()
  })
})
