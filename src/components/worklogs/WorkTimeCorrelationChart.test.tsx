import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { WorkTimeCorrelationChart } from './WorkTimeCorrelationChart'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function renderChart() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return render(<WorkTimeCorrelationChart projectId="p-1" />, { wrapper: Wrapper })
}

describe('WorkTimeCorrelationChart', () => {
  it('shows an empty state when no story-pointed issue has logged hours', async () => {
    server.use(
      http.get(url('/projects/p-1/worklogs/correlation'), () =>
        HttpResponse.json({ success: true, data: { entries: [] } }),
      ),
    )
    renderChart()

    expect(
      await screen.findByText('No story-pointed issues with logged hours yet.'),
    ).toBeInTheDocument()
  })

  it('renders the chart title once there is data to plot', async () => {
    server.use(
      http.get(url('/projects/p-1/worklogs/correlation'), () =>
        HttpResponse.json({
          success: true,
          data: {
            entries: [
              {
                taskId: 't-1',
                issueKey: 'PRJ-1',
                title: 'Ship it',
                storyPoints: 5,
                loggedHours: 8,
              },
            ],
          },
        }),
      ),
    )
    renderChart()

    expect(await screen.findByText('Story Points vs. Time Spent')).toBeInTheDocument()
  })

  it('shows an error state when the request fails', async () => {
    server.use(
      http.get(url('/projects/p-1/worklogs/correlation'), () =>
        HttpResponse.json({ success: false, message: 'boom' }, { status: 500 }),
      ),
    )
    renderChart()

    expect(await screen.findByText('boom')).toBeInTheDocument()
  })
})
