import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { EpicsList } from '@/components/tasks/EpicsList'
import type { Task } from '@/types/task.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function makeEpic(overrides: Partial<Task> = {}): Task {
  return {
    id: 'epic-1',
    title: 'Billing overhaul',
    description: '',
    project: { id: 'p-1', name: 'A project' },
    assignee: null,
    status: 'Todo',
    statusCategory: 'To Do',
    priority: 'P2',
    dueDate: null,
    createdBy: {
      id: 'u-1',
      name: 'Creator',
      email: 'c@a.com',
      role: 'Admin',
      isActive: true,
      organizationId: 'org-1',
      createdAt: '',
      updatedAt: '',
    },
    sprint: null,
    rank: 0,
    issueType: 'Epic',
    parent: null,
    storyPoints: null,
    issueKey: 'PRJ-1',
    labels: [],
    components: [],
    customFieldValues: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderEpicsList(epics: Task[]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }
  return render(<EpicsList epics={epics} />, { wrapper: Wrapper })
}

describe('EpicsList', () => {
  it('shows an empty state when there are no epics', () => {
    renderEpicsList([])
    expect(screen.getByText('No epics yet')).toBeInTheDocument()
  })

  it("renders an epic's title, key, and progress bar from the epic-progress endpoint", async () => {
    server.use(
      http.get(url('/tasks/:id/epic-progress'), () =>
        HttpResponse.json({
          success: true,
          data: { linkedIssueCount: 4, doneCount: 1, progress: 25 },
        }),
      ),
    )
    renderEpicsList([makeEpic()])

    expect(screen.getByText('Billing overhaul')).toBeInTheDocument()
    expect(screen.getByText('PRJ-1')).toBeInTheDocument()
    expect(await screen.findByText('1/4 done')).toBeInTheDocument()
    expect(screen.getByText('25% complete')).toBeInTheDocument()
  })

  it('shows a target date when the epic has a dueDate (Phase 2 gap-closure - BRD 6.4)', () => {
    server.use(
      http.get(url('/tasks/:id/epic-progress'), () =>
        HttpResponse.json({
          success: true,
          data: { linkedIssueCount: 0, doneCount: 0, progress: 0 },
        }),
      ),
    )
    renderEpicsList([makeEpic({ dueDate: '2026-03-01T00:00:00.000Z' })])

    expect(screen.getByText(/Target:/)).toBeInTheDocument()
  })

  it('shows no target date line when the epic has no dueDate', () => {
    server.use(
      http.get(url('/tasks/:id/epic-progress'), () =>
        HttpResponse.json({
          success: true,
          data: { linkedIssueCount: 0, doneCount: 0, progress: 0 },
        }),
      ),
    )
    renderEpicsList([makeEpic({ dueDate: null })])

    expect(screen.queryByText(/Target:/)).not.toBeInTheDocument()
  })

  it('shows 0% before the progress data has loaded, rather than a broken/undefined bar', () => {
    server.use(
      http.get(url('/tasks/:id/epic-progress'), () => new Promise(() => {})), // never resolves
    )
    renderEpicsList([makeEpic()])

    expect(screen.getByText('0% complete')).toBeInTheDocument()
  })
})
