import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { MyTimesheetPage } from '@/pages/worklogs/MyTimesheetPage'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return render(<MyTimesheetPage />, { wrapper: Wrapper })
}

describe('MyTimesheetPage', () => {
  it('shows an empty state when no work has been logged', async () => {
    server.use(
      http.get(url('/worklogs/my-timesheet'), () =>
        HttpResponse.json({ success: true, data: { groupBy: 'week', buckets: [] } }),
      ),
    )
    renderPage()

    expect(await screen.findByText('No work logged yet')).toBeInTheDocument()
  })

  it('renders a bucket with its entries', async () => {
    server.use(
      http.get(url('/worklogs/my-timesheet'), () =>
        HttpResponse.json({
          success: true,
          data: {
            groupBy: 'week',
            buckets: [
              {
                bucketStart: '2026-03-02',
                totalHours: 3,
                billableHours: 2,
                entries: [
                  {
                    id: 'wl-1',
                    taskId: 't-1',
                    issueKey: 'PRJ-1',
                    taskTitle: 'Fix the bug',
                    projectId: 'p-1',
                    projectName: 'Alpha',
                    hours: 3,
                    workDate: '2026-03-02T00:00:00.000Z',
                    billable: true,
                    description: '',
                  },
                ],
              },
            ],
          },
        }),
      ),
    )
    renderPage()

    expect(await screen.findByText(/Week of/)).toBeInTheDocument()
    expect(screen.getByText('PRJ-1')).toBeInTheDocument()
    expect(screen.getByText('Fix the bug')).toBeInTheDocument()
    expect(screen.getByText('Alpha', { exact: false })).toBeInTheDocument()
  })

  it('shows an error state when the request fails', async () => {
    server.use(
      http.get(url('/worklogs/my-timesheet'), () =>
        HttpResponse.json({ success: false, message: 'boom' }, { status: 500 }),
      ),
    )
    renderPage()

    expect(await screen.findByText('boom')).toBeInTheDocument()
  })
})
