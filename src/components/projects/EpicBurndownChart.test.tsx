import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { EpicBurndownChart } from './EpicBurndownChart'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function renderChart() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return render(<EpicBurndownChart projectId="p-1" />, { wrapper: Wrapper })
}

function mockEpics(epics: Array<{ epicId: string; title: string }>) {
  server.use(
    http.get(url('/projects/p-1/reports/epic-progress'), () =>
      HttpResponse.json({
        success: true,
        data: epics.map((e) => ({
          ...e,
          issueKey: null,
          linkedIssueCount: 0,
          doneCount: 0,
          progress: 0,
        })),
      }),
    ),
  )
}

describe('EpicBurndownChart', () => {
  it('shows a "no epics" placeholder in the picker when the project has no epics (regression)', async () => {
    mockEpics([])
    renderChart()

    expect(await screen.findByText('No epics yet')).toBeInTheDocument()
    expect(screen.getByText('Select an epic.')).toBeInTheDocument()
  })

  it('auto-selects the first epic and shows an empty state when it has no linked issues', async () => {
    mockEpics([{ epicId: 'e-1', title: 'Epic One' }])
    server.use(
      http.get(url('/tasks/e-1/epic-burndown'), () =>
        HttpResponse.json({
          success: true,
          data: { points: [], hasStoryPoints: false, hasIdealLine: false },
        }),
      ),
    )
    renderChart()

    expect(await screen.findByText('This epic has no linked issues yet.')).toBeInTheDocument()
  })

  it('renders the chart title once there is data to plot', async () => {
    mockEpics([{ epicId: 'e-1', title: 'Epic One' }])
    server.use(
      http.get(url('/tasks/e-1/epic-burndown'), () =>
        HttpResponse.json({
          success: true,
          data: {
            hasStoryPoints: true,
            hasIdealLine: true,
            points: [
              {
                date: '2026-01-01',
                remainingPoints: 5,
                remainingCount: 2,
                idealRemainingPoints: 5,
                idealRemainingCount: 2,
              },
            ],
          },
        }),
      ),
    )
    renderChart()

    await waitFor(() => expect(screen.getByText('Epic One')).toBeInTheDocument())
    expect(await screen.findByText('Epic Burndown')).toBeInTheDocument()
    expect(screen.getByText('Remaining story points vs. ideal')).toBeInTheDocument()
  })

  it('shows an error state when the burndown request fails', async () => {
    mockEpics([{ epicId: 'e-1', title: 'Epic One' }])
    server.use(
      http.get(url('/tasks/e-1/epic-burndown'), () =>
        HttpResponse.json({ success: false, message: 'boom' }, { status: 500 }),
      ),
    )
    renderChart()

    expect(await screen.findByText('boom')).toBeInTheDocument()
  })
})
