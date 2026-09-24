import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { mockProjects } from '@/test/mocks/fixtures'
import { TimesheetPanel } from '@/components/worklogs/TimesheetPanel'
import type { WorkLogReport, WorkLogWithTask } from '@/types/worklog.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function mockProject() {
  server.use(
    http.get(url('/projects/p-1'), () =>
      HttpResponse.json({ success: true, data: { ...mockProjects[0]!, id: 'p-1' } }),
    ),
  )
}

function mockReport(report: WorkLogReport) {
  server.use(
    http.get(url('/projects/p-1/worklogs/report'), () =>
      HttpResponse.json({ success: true, data: report }),
    ),
  )
}

function mockLogs(logs: WorkLogWithTask[]) {
  server.use(
    http.get(url('/projects/p-1/worklogs'), () =>
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

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return render(<TimesheetPanel projectId="p-1" />, { wrapper: Wrapper })
}

describe('TimesheetPanel', () => {
  it('shows an empty state for both tables when nothing has been logged', async () => {
    mockProject()
    mockReport({ entries: [], totalHours: 0, billableHours: 0, nonBillableHours: 0 })
    mockLogs([])
    renderPanel()

    expect(await screen.findAllByText('No work logged yet.')).toHaveLength(2)
  })

  it('renders per-user totals in the report table', async () => {
    mockProject()
    mockReport({
      entries: [
        {
          userId: 'u-1',
          userName: 'Dev One',
          totalHours: 6,
          billableHours: 4,
          nonBillableHours: 2,
          entryCount: 3,
        },
      ],
      totalHours: 6,
      billableHours: 4,
      nonBillableHours: 2,
    })
    mockLogs([])
    renderPanel()

    expect(await screen.findByText('Dev One')).toBeInTheDocument()
    expect(screen.getByText('6h')).toBeInTheDocument()
  })

  it('renders raw log entries with the issue key', async () => {
    mockProject()
    mockReport({ entries: [], totalHours: 0, billableHours: 0, nonBillableHours: 0 })
    mockLogs([
      {
        id: 'wl-1',
        task: { id: 't-1', title: 'Fix the bug', issueKey: 'PRJ-1' },
        user: {
          id: 'u-1',
          name: 'Dev One',
          email: 'dev1@a.com',
          role: 'Developer',
          isActive: true,
          organizationId: 'org-1',
          createdAt: '',
          updatedAt: '',
        },
        hours: 2,
        description: 'Root-caused it',
        workDate: '2026-03-01T00:00:00.000Z',
        billable: true,
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
      },
    ])
    renderPanel()

    expect(await screen.findByText('PRJ-1')).toBeInTheDocument()
    expect(screen.getByText('Root-caused it')).toBeInTheDocument()
  })
})
