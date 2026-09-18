import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { ActiveSprintsHealthList } from './ActiveSprintsHealthList'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function renderList() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }
  return render(<ActiveSprintsHealthList scope={{}} />, { wrapper: Wrapper })
}

describe('ActiveSprintsHealthList', () => {
  it('shows an empty state when there are no active sprints (regression)', async () => {
    server.use(
      http.get(url('/dashboard/active-sprints-health'), () =>
        HttpResponse.json({ success: true, data: [] }),
      ),
    )
    renderList()

    expect(await screen.findByText('No active sprints')).toBeInTheDocument()
  })

  it('lists each active sprint with its remaining work and time elapsed', async () => {
    server.use(
      http.get(url('/dashboard/active-sprints-health'), () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              sprintId: 's-1',
              sprintName: 'Sprint 1',
              projectId: 'p-1',
              projectName: 'Website Revamp',
              percentTimeElapsed: 80,
              percentWorkRemaining: 60,
              remainingPoints: 6,
              remainingCount: 2,
              hasStoryPoints: true,
            },
          ],
        }),
      ),
    )
    renderList()

    expect(await screen.findByText('Sprint 1')).toBeInTheDocument()
    expect(screen.getByText('Website Revamp')).toBeInTheDocument()
    expect(screen.getByText('6 remaining')).toBeInTheDocument()
    expect(screen.getByText('80% time elapsed')).toBeInTheDocument()
  })

  it('falls back to remainingCount when the sprint has no story points', async () => {
    server.use(
      http.get(url('/dashboard/active-sprints-health'), () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              sprintId: 's-1',
              sprintName: 'Sprint 1',
              projectId: 'p-1',
              projectName: 'Website Revamp',
              percentTimeElapsed: 10,
              percentWorkRemaining: 90,
              remainingPoints: 0,
              remainingCount: 4,
              hasStoryPoints: false,
            },
          ],
        }),
      ),
    )
    renderList()

    expect(await screen.findByText('4 remaining')).toBeInTheDocument()
  })

  it('shows an error state when the request fails', async () => {
    server.use(
      http.get(url('/dashboard/active-sprints-health'), () =>
        HttpResponse.json({ success: false, message: 'boom' }, { status: 500 }),
      ),
    )
    renderList()

    expect(await screen.findByText('boom')).toBeInTheDocument()
  })
})
