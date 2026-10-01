import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { SystemOverviewPage } from './SystemOverviewPage'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

const STATS = {
  generatedAt: '2026-10-01T00:00:00.000Z',
  users: {
    total: 5,
    active: 4,
    inactive: 1,
    byRole: {
      Admin: { total: 1, active: 1 },
      Manager: { total: 1, active: 1 },
      Developer: { total: 3, active: 2 },
    },
  },
  projects: {
    total: 3,
    archived: 1,
    byStatus: { Planning: 1, 'In Progress': 2, Completed: 0 },
    createdLast30Days: 2,
  },
  tasks: {
    total: 40,
    open: 25,
    completed: 15,
    overdue: 6,
    createdLast7Days: 9,
    completedLast7Days: 7,
  },
  sprints: { active: 2 },
  activity: {
    auditEventsLast7Days: 3,
    recent: [
      {
        id: 'a-1',
        organizationId: 'org-1',
        actor: { id: 'u-1', name: 'Ada Admin', email: 'ada@example.com' },
        action: 'ProjectCategoryCreated',
        targetType: 'ProjectCategory',
        targetId: 'cat-1',
        targetLabel: 'Client Work',
        metadata: {},
        createdAt: '2026-09-30T10:00:00.000Z',
      },
    ],
  },
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }
  return render(<SystemOverviewPage />, { wrapper: Wrapper })
}

describe('SystemOverviewPage (Module 8 gap-closure)', () => {
  it('shows org-wide counts, the role breakdown and recent admin activity', async () => {
    server.use(
      http.get(url('/admin-console/stats'), () =>
        HttpResponse.json({ success: true, data: STATS }),
      ),
    )
    renderPage()

    expect(await screen.findByText('4 / 5')).toBeInTheDocument()
    expect(screen.getByText('Overdue tasks').parentElement?.parentElement).toHaveTextContent('6')
    expect(screen.getByText('Archived projects').parentElement?.parentElement).toHaveTextContent(
      '1',
    )
    expect(screen.getByText('1 deactivated user')).toBeInTheDocument()
    expect(screen.getByText('Ada Admin')).toBeInTheDocument()
    expect(screen.getByText(/project category created · Client Work/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View full audit log' })).toHaveAttribute(
      'href',
      '/admin/audit-log',
    )
  })

  it('shows an error state when the stats request fails', async () => {
    server.use(
      http.get(url('/admin-console/stats'), () =>
        HttpResponse.json(
          {
            statusCode: 500,
            message: 'Stats unavailable',
            error: 'Error',
            timestamp: new Date().toISOString(),
            path: '',
          },
          { status: 500 },
        ),
      ),
    )
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Stats unavailable')
  })
})
