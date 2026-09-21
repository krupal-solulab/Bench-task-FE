import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { SprintHistoryList } from '@/components/sprints/SprintHistoryList'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function renderList() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return render(<SprintHistoryList projectId="p-1" />, { wrapper: Wrapper })
}

describe('SprintHistoryList', () => {
  it('shows an empty state when there is no sprint history yet', async () => {
    server.use(
      http.get(url('/projects/p-1/sprints/history'), () =>
        HttpResponse.json({ success: true, data: [] }),
      ),
    )
    renderList()
    expect(await screen.findByText('No sprint history yet')).toBeInTheDocument()
  })

  it('renders each past sprint with its date range, goal, and completion rate', async () => {
    server.use(
      http.get(url('/projects/p-1/sprints/history'), () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: 's-1',
              name: 'Sprint 1',
              goal: 'Ship the thing',
              startDate: '2026-01-01T00:00:00.000Z',
              endDate: '2026-01-14T00:00:00.000Z',
              completionRatePercent: 75,
            },
          ],
        }),
      ),
    )
    renderList()

    expect(await screen.findByText('Sprint 1')).toBeInTheDocument()
    expect(screen.getByText('75% complete')).toBeInTheDocument()
    expect(screen.getByText(/Ship the thing/)).toBeInTheDocument()
  })
})
