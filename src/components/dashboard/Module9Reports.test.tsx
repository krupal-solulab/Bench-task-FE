import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { server } from '@/test/mocks/server'
import { mockUsers } from '@/test/mocks/fixtures'
import { DashboardPage } from '@/pages/DashboardPage'
import { CfdChart } from '@/components/projects/CfdChart'
import { ReleaseEtaText } from '@/components/releases/ReleaseEtaText'
import { ReleaseForecastCard } from '@/components/dashboard/ReleaseForecastCard'
import type { ReleaseEta } from '@/types/release.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const auth: AuthContextValue = {
    user: mockUsers[0]!,
    isAuthenticated: true,
    isLoading: false,
    login: async () => {},
    registerOrganization: async () => {},
    logout: async () => {},
    hasRole: () => true,
    updateUser: () => {},
  }
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ToastProvider>
            <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
          </ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}

describe('Module 9 gap-closure: report gadgets on the dashboard', () => {
  it('are OFF by default - an unsaved dashboard shows none of them', async () => {
    render(<DashboardPage />, { wrapper: wrapper() })
    await screen.findByText('Projects by status')
    expect(screen.queryByText('Cumulative Flow Diagram')).not.toBeInTheDocument()
    expect(screen.queryByText('Release Forecast')).not.toBeInTheDocument()
  })

  it('appear once turned on, asking for a project while "All projects" is selected', async () => {
    server.use(
      http.get(url('/dashboard/preferences'), () =>
        HttpResponse.json({
          success: true,
          data: {
            hiddenWidgets: ['controlChart'],
            widgetOrder: ['cumulativeFlow', 'controlChart'],
          },
        }),
      ),
    )
    render(<DashboardPage />, { wrapper: wrapper() })

    // Generous timeout: preferences load after the first render, and the full suite runs under load.
    expect(
      await screen.findByText('Cumulative Flow Diagram', {}, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Choose a project in the filter above to see this report.'),
    ).toBeInTheDocument()
    // Turned on but then hidden again, and never turned on - both stay off.
    expect(screen.queryByText('Control Chart')).not.toBeInTheDocument()
    expect(screen.queryByText('Release Forecast')).not.toBeInTheDocument()
  })
})

describe('Module 9 gap-closure: CFD bottleneck highlight', () => {
  it("names the bottleneck in the chart's description when in-progress work piles up", async () => {
    const wip = [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 5, 6, 7, 8, 8, 9]
    server.use(
      http.get(url('/projects/p-1/reports/cfd'), () =>
        HttpResponse.json({
          success: true,
          data: wip.map((inProgress, i) => ({
            date: `2026-09-${String(i + 1).padStart(2, '0')}`,
            toDo: 4,
            inProgress,
            done: 1,
          })),
        }),
      ),
    )
    render(<CfdChart projectId="p-1" />, { wrapper: wrapper() })
    expect(
      await screen.findByText(/^Bottleneck: work in progress grew from 2 to/),
    ).toBeInTheDocument()
  })
})

describe('Module 9 gap-closure: release ETA', () => {
  const eta = (overrides: Partial<ReleaseEta>): ReleaseEta => ({
    remainingIssues: 4,
    throughputPerWeek: 2,
    basis: 'release',
    projectedDate: '2026-10-15T00:00:00.000Z',
    onTrack: null,
    daysLate: null,
    ...overrides,
  })

  it('shows the projection with an on-track or late badge', () => {
    const { rerender } = render(<ReleaseEtaText eta={eta({ onTrack: true, daysLate: 0 })} />)
    expect(screen.getByText(/Projected: .*\(4 left at 2\/week\)/)).toBeInTheDocument()
    expect(screen.getByText('On track')).toBeInTheDocument()

    rerender(<ReleaseEtaText eta={eta({ onTrack: false, daysLate: 6, basis: 'project' })} />)
    expect(screen.getByText('6 days late')).toBeInTheDocument()
    expect(screen.getByText(/2\/week project-wide/)).toBeInTheDocument()
  })

  it('says when there is no history to project from, or nothing left', () => {
    const { rerender } = render(
      <ReleaseEtaText eta={eta({ projectedDate: null, throughputPerWeek: null, basis: null })} />,
    )
    expect(screen.getByText('ETA: not enough recent completions to project')).toBeInTheDocument()
    rerender(<ReleaseEtaText eta={eta({ remainingIssues: 0 })} />)
    expect(screen.getByText('All issues done')).toBeInTheDocument()
  })

  it('lists each unreleased release in the forecast gadget', async () => {
    server.use(
      http.get(url('/projects/p-1/releases/forecast'), () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              releaseId: 'r-1',
              name: 'v1.0',
              releaseDate: '2026-10-30T00:00:00.000Z',
              totalIssues: 6,
              doneIssues: 2,
              progress: 33,
              eta: eta({ onTrack: true, daysLate: 0 }),
            },
          ],
        }),
      ),
    )
    render(<ReleaseForecastCard projectId="p-1" />, { wrapper: wrapper() })
    expect(await screen.findByText('v1.0')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'v1.0 progress' })).toHaveAttribute(
      'aria-valuenow',
      '33',
    )
    expect(screen.getByText('On track')).toBeInTheDocument()
  })
})
