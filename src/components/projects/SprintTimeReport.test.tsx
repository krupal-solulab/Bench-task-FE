import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { SprintTimeReport } from '@/components/projects/SprintTimeReport'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function renderReport(sprintId: string | undefined) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }
  return render(<SprintTimeReport projectId="p-1" sprintId={sprintId} />, { wrapper: Wrapper })
}

describe('SprintTimeReport', () => {
  it('renders nothing when no sprint is selected', () => {
    const { container } = renderReport(undefined)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows an empty state when the sprint has no tasks', async () => {
    server.use(
      http.get(url('/projects/p-1/sprints/s-1/worklogs/report'), () =>
        HttpResponse.json({
          success: true,
          data: {
            sprintId: 's-1',
            sprintName: 'Sprint 1',
            totalEstimateHours: 0,
            totalLoggedHours: 0,
            tasks: [],
          },
        }),
      ),
    )
    renderReport('s-1')

    expect(await screen.findByText('No tasks in this sprint')).toBeInTheDocument()
  })

  it("lists each task's logged vs. estimated hours", async () => {
    server.use(
      http.get(url('/projects/p-1/sprints/s-1/worklogs/report'), () =>
        HttpResponse.json({
          success: true,
          data: {
            sprintId: 's-1',
            sprintName: 'Sprint 1',
            totalEstimateHours: 6,
            totalLoggedHours: 3,
            tasks: [
              {
                taskId: 't-1',
                issueKey: 'PRJ-1',
                title: 'Ship it',
                originalEstimateHours: 6,
                loggedHours: 3,
              },
            ],
          },
        }),
      ),
    )
    renderReport('s-1')

    expect(await screen.findByText('PRJ-1')).toBeInTheDocument()
    expect(screen.getByText('3h / 6h')).toBeInTheDocument()
    expect(screen.getByText(/3h logged of 6h estimated/)).toBeInTheDocument()
  })
})
