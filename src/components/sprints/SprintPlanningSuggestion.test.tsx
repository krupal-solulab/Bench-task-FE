import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { server } from '@/test/mocks/server'
import { SprintPlanningSuggestion } from './SprintPlanningSuggestion'
import type { Sprint } from '@/types/sprint.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

const SPRINT: Sprint = {
  id: 's-1',
  name: 'Sprint 1',
  goal: '',
  project: 'p-1',
  status: 'Planned',
  startDate: '2026-01-01',
  endDate: '2026-01-14',
  startedAt: null,
  completedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function renderComponent() {
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
  return render(<SprintPlanningSuggestion projectId="p-1" sprint={SPRINT} />, { wrapper: Wrapper })
}

describe('SprintPlanningSuggestion', () => {
  it('renders nothing when there is no suggestion basis (regression)', async () => {
    let requestHandled = false
    server.use(
      http.get(url('/projects/p-1/sprints/s-1/planning-suggestion'), () => {
        requestHandled = true
        return HttpResponse.json({
          success: true,
          data: {
            suggestedTaskIds: [],
            suggestedPoints: 0,
            suggestedCount: 0,
            targetPoints: null,
            targetCount: null,
            basis: 'none',
          },
        })
      }),
    )
    renderComponent()

    await waitFor(() => expect(requestHandled).toBe(true))
    await waitFor(() => expect(screen.queryByText(/Suggested scope/)).not.toBeInTheDocument())
  })

  it('shows the suggested scope and basis when a capacity-based suggestion exists', async () => {
    server.use(
      http.get(url('/projects/p-1/sprints/s-1/planning-suggestion'), () =>
        HttpResponse.json({
          success: true,
          data: {
            suggestedTaskIds: ['t-1', 't-2'],
            suggestedPoints: 8,
            suggestedCount: 2,
            targetPoints: 8,
            targetCount: null,
            basis: 'capacity',
          },
        }),
      ),
    )
    renderComponent()

    expect(await screen.findByText(/Suggested scope: 2 issues \(8 pts\)/)).toBeInTheDocument()
    expect(screen.getByText(/this sprint's capacity/)).toBeInTheDocument()
  })

  it('adds the suggested issues to the sprint on click', async () => {
    server.use(
      http.get(url('/projects/p-1/sprints/s-1/planning-suggestion'), () =>
        HttpResponse.json({
          success: true,
          data: {
            suggestedTaskIds: ['t-1'],
            suggestedPoints: 3,
            suggestedCount: 1,
            targetPoints: 3,
            targetCount: null,
            basis: 'capacity',
          },
        }),
      ),
    )
    let capturedBody: unknown = null
    server.use(
      http.patch(url('/tasks/bulk-move-sprint'), async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ success: true, data: { succeeded: ['t-1'], failed: [] } })
      }),
    )
    const user = userEvent.setup()
    renderComponent()

    await user.click(await screen.findByRole('button', { name: 'Add suggested to sprint' }))

    await waitFor(() =>
      expect(screen.getByText('Added 1 suggested issue(s) to Sprint 1')).toBeInTheDocument(),
    )
    expect(capturedBody).toEqual({ taskIds: ['t-1'], sprintId: 's-1' })
  })
})
