import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { EpicRoadmapTimeline } from './EpicRoadmapTimeline'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function renderTimeline() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return render(<EpicRoadmapTimeline projectId="p-1" />, { wrapper: Wrapper })
}

describe('EpicRoadmapTimeline', () => {
  it('shows an empty state when no epic has a target date (Phase 2 gap-closure - BRD 6.4)', async () => {
    server.use(
      http.get(url('/projects/p-1/reports/epic-progress'), () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              epicId: 'e-1',
              issueKey: 'PRJ-1',
              title: 'Epic A',
              linkedIssueCount: 0,
              doneCount: 0,
              progress: 0,
              dueDate: null,
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        }),
      ),
    )
    renderTimeline()

    expect(
      await screen.findByText(
        'No epics with a target date yet - set one on an epic to see it here.',
      ),
    ).toBeInTheDocument()
  })

  it('renders the chart title once an epic has a target date', async () => {
    server.use(
      http.get(url('/projects/p-1/reports/epic-progress'), () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              epicId: 'e-1',
              issueKey: 'PRJ-1',
              title: 'Epic A',
              linkedIssueCount: 4,
              doneCount: 1,
              progress: 25,
              dueDate: '2026-01-11T00:00:00.000Z',
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        }),
      ),
    )
    renderTimeline()

    expect(await screen.findByText('Epic roadmap')).toBeInTheDocument()
    expect(
      await screen.findByText("Each epic's span from creation to its target date"),
    ).toBeInTheDocument()
  })

  it('shows an error state when the request fails', async () => {
    server.use(
      http.get(url('/projects/p-1/reports/epic-progress'), () =>
        HttpResponse.json({ success: false, message: 'boom' }, { status: 500 }),
      ),
    )
    renderTimeline()

    expect(await screen.findByText('boom')).toBeInTheDocument()
  })
})
