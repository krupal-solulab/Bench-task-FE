import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '@/test/mocks/server'
import { mockProjects } from '@/test/mocks/fixtures'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
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

function mockCorrelation() {
  server.use(
    http.get(url('/projects/p-1/worklogs/correlation'), () =>
      HttpResponse.json({ success: true, data: { entries: [] } }),
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
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          {children}
          <ToastViewport />
        </ToastProvider>
      </QueryClientProvider>
    )
  }
  return render(<TimesheetPanel projectId="p-1" />, { wrapper: Wrapper })
}

describe('TimesheetPanel', () => {
  it('shows an empty state for both tables when nothing has been logged', async () => {
    mockProject()
    mockCorrelation()
    mockReport({
      entries: [],
      totalHours: 0,
      billableHours: 0,
      nonBillableHours: 0,
      totalEstimateHours: 0,
    })
    mockLogs([])
    renderPanel()

    expect(await screen.findAllByText('No work logged yet.')).toHaveLength(2)
  })

  it('renders per-user totals in the report table', async () => {
    mockProject()
    mockCorrelation()
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
      totalEstimateHours: 0,
    })
    mockLogs([])
    renderPanel()

    expect(await screen.findByText('Dev One')).toBeInTheDocument()
    expect(screen.getByText('6h')).toBeInTheDocument()
  })

  it('renders raw log entries with the issue key', async () => {
    mockProject()
    mockCorrelation()
    mockReport({
      entries: [],
      totalHours: 0,
      billableHours: 0,
      nonBillableHours: 0,
      totalEstimateHours: 0,
    })
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

  it('shows the project-wide estimate-vs-actual rollup', async () => {
    mockProject()
    mockCorrelation()
    mockReport({
      entries: [],
      totalHours: 4,
      billableHours: 4,
      nonBillableHours: 0,
      totalEstimateHours: 10,
    })
    mockLogs([])
    renderPanel()

    expect(await screen.findByText(/4h logged of 10h estimated/)).toBeInTheDocument()
  })

  describe('CSV export', () => {
    let clickSpy: ReturnType<typeof vi.fn>

    beforeEach(() => {
      URL.createObjectURL = vi.fn(() => 'blob:mock-url') as unknown as typeof URL.createObjectURL
      URL.revokeObjectURL = vi.fn() as unknown as typeof URL.revokeObjectURL
      clickSpy = vi.fn()
      HTMLAnchorElement.prototype.click = clickSpy
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('downloads the exported CSV when Export CSV is clicked', async () => {
      mockProject()
      mockCorrelation()
      mockReport({
        entries: [],
        totalHours: 0,
        billableHours: 0,
        nonBillableHours: 0,
        totalEstimateHours: 0,
      })
      mockLogs([])
      server.use(
        http.get(url('/projects/p-1/worklogs/export'), () =>
          HttpResponse.json({
            success: true,
            data: { filename: 'proj-timesheet-2026-03-01.csv', csv: 'User,Task\nDev One,PRJ-1' },
          }),
        ),
      )
      const user = userEvent.setup()
      renderPanel()

      await user.click(await screen.findByRole('button', { name: /Export CSV/ }))

      await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1))
    })
  })
})
