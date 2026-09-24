import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { server } from '@/test/mocks/server'
import { RoadmapPage } from '@/pages/roadmap/RoadmapPage'
import type { RoadmapData } from '@/types/issue-link.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function mockProjectsList() {
  server.use(
    http.get(url('/projects'), () =>
      HttpResponse.json({
        success: true,
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 100,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      }),
    ),
  )
}

function mockRoadmap(data: RoadmapData) {
  server.use(
    http.get(url('/projects/reports/roadmap'), () => HttpResponse.json({ success: true, data })),
  )
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ToastProvider>{children}</ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
  return render(<RoadmapPage />, { wrapper: Wrapper })
}

describe('RoadmapPage', () => {
  it('shows an empty state when there are no epics', async () => {
    mockProjectsList()
    mockRoadmap({ projects: [], epics: [], capacity: [] })
    renderPage()

    expect(await screen.findByText('No epics to show')).toBeInTheDocument()
  })

  it('lists epics across projects with capacity and a cross-project blocking warning', async () => {
    mockProjectsList()
    mockRoadmap({
      projects: [
        { id: 'p-1', name: 'Project A' },
        { id: 'p-2', name: 'Project B' },
      ],
      epics: [
        {
          epicId: 'e-1',
          issueKey: 'PA-1',
          title: 'Epic in A',
          statusCategory: 'To Do',
          dueDate: '2026-02-01T00:00:00.000Z',
          createdAt: '2026-01-01T00:00:00.000Z',
          project: { id: 'p-1', name: 'Project A' },
          linkedIssueCount: 2,
          doneCount: 1,
          progress: 50,
          blockedByExternal: [
            { epicId: 'e-2', issueKey: 'PB-1', title: 'Epic in B', projectName: 'Project B' },
          ],
        },
      ],
      capacity: [
        { projectId: 'p-1', activeSprintId: 'sprint-1', capacityPoints: 20, committedPoints: 8 },
        { projectId: 'p-2', activeSprintId: null, capacityPoints: null, committedPoints: 0 },
      ],
    })
    renderPage()

    expect(await screen.findByText('Epic in A')).toBeInTheDocument()
    expect(screen.getByText('8 / 20 points committed')).toBeInTheDocument()
    expect(screen.getByText('No active sprint')).toBeInTheDocument()
    expect(screen.getByText(/Blocked by/)).toBeInTheDocument()
    expect(screen.getByText('PB-1')).toBeInTheDocument()
  })
})
