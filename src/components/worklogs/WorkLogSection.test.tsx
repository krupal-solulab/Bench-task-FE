import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { server } from '@/test/mocks/server'
import { WorkLogSection } from '@/components/worklogs/WorkLogSection'
import type { WorkLog, WorkLogSummary } from '@/types/worklog.types'
import type { User } from '@/types/user.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function mockSummary(summary: WorkLogSummary) {
  server.use(
    http.get(url('/tasks/task-1/worklogs/summary'), () =>
      HttpResponse.json({ success: true, data: summary }),
    ),
  )
}

function mockLogs(logs: WorkLog[]) {
  server.use(
    http.get(url('/tasks/task-1/worklogs'), () =>
      HttpResponse.json({
        success: true,
        data: logs,
        meta: {
          total: logs.length,
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

const USER: User = {
  id: 'u-1',
  name: 'Dev One',
  email: 'dev1@a.com',
  role: 'Developer',
  isActive: true,
  organizationId: 'org-1',
  createdAt: '',
  updatedAt: '',
}

const AUTH_VALUE: AuthContextValue = {
  user: USER,
  isAuthenticated: true,
  isLoading: false,
  login: async () => {},
  registerOrganization: async () => {},
  logout: async () => {},
  hasRole: () => false,
}

function renderSection() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthContext.Provider value={AUTH_VALUE}>
            {children}
            <ToastViewport />
          </AuthContext.Provider>
        </ToastProvider>
      </QueryClientProvider>
    )
  }
  return render(<WorkLogSection taskId="task-1" />, { wrapper: Wrapper })
}

describe('WorkLogSection', () => {
  it('shows an empty state and no estimate bar when nothing is logged and no estimate is set', async () => {
    mockSummary({
      taskId: 'task-1',
      originalEstimateHours: null,
      totalLoggedHours: 0,
      remainingHours: null,
      varianceHours: null,
    })
    mockLogs([])
    renderSection()

    expect(await screen.findByText('No work logged yet.')).toBeInTheDocument()
    expect(await screen.findByText(/no estimate set/)).toBeInTheDocument()
  })

  it('shows the estimate-vs-actual progress summary', async () => {
    mockSummary({
      taskId: 'task-1',
      originalEstimateHours: 8,
      totalLoggedHours: 3,
      remainingHours: 5,
      varianceHours: -5,
    })
    mockLogs([])
    renderSection()

    expect(await screen.findByText('3h logged of 8h estimated')).toBeInTheDocument()
  })

  it('flags when logged hours exceed the estimate', async () => {
    mockSummary({
      taskId: 'task-1',
      originalEstimateHours: 2,
      totalLoggedHours: 5,
      remainingHours: 0,
      varianceHours: 3,
    })
    mockLogs([])
    renderSection()

    expect(await screen.findByText(/3h over estimate/)).toBeInTheDocument()
  })

  it('lists an existing work log entry', async () => {
    mockSummary({
      taskId: 'task-1',
      originalEstimateHours: null,
      totalLoggedHours: 2,
      remainingHours: null,
      varianceHours: null,
    })
    mockLogs([
      {
        id: 'wl-1',
        task: 'task-1',
        user: USER,
        hours: 2,
        description: 'Set up scaffolding',
        workDate: '2026-03-01T00:00:00.000Z',
        billable: true,
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
      },
    ])
    renderSection()

    expect(await screen.findByText('Set up scaffolding')).toBeInTheDocument()
    expect(screen.getByText('Dev One')).toBeInTheDocument()
  })

  it('logs work via the "Log work" modal', async () => {
    mockSummary({
      taskId: 'task-1',
      originalEstimateHours: null,
      totalLoggedHours: 0,
      remainingHours: null,
      varianceHours: null,
    })
    mockLogs([])
    let createdBody: Record<string, unknown> | null = null
    server.use(
      http.post(url('/tasks/task-1/worklogs'), async ({ request }) => {
        createdBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          {
            success: true,
            data: {
              id: 'wl-new',
              task: 'task-1',
              user: USER,
              hours: createdBody.hours,
              description: createdBody.description ?? '',
              workDate: createdBody.workDate,
              billable: true,
              createdAt: '2026-03-01T00:00:00.000Z',
              updatedAt: '2026-03-01T00:00:00.000Z',
            },
          },
          { status: 201 },
        )
      }),
    )
    const user = userEvent.setup()
    renderSection()

    await screen.findByText('No work logged yet.')
    await user.click(screen.getByRole('button', { name: /Log work/ }))
    await user.clear(screen.getByLabelText('Hours', { exact: false }))
    await user.type(screen.getByLabelText('Hours', { exact: false }), '2')

    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Log work' }))

    await waitFor(() => expect(createdBody).not.toBeNull())
    expect(createdBody).toMatchObject({ hours: 2 })
  })
})
