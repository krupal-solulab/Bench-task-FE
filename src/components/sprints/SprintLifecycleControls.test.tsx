import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { server } from '@/test/mocks/server'
import { SprintLifecycleControls } from '@/components/sprints/SprintLifecycleControls'
import type { Sprint } from '@/types/sprint.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function makeSprint(overrides: Partial<Sprint> = {}): Sprint {
  return {
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
    ...overrides,
  }
}

function renderControls(sprint: Sprint, canManage: boolean, plannedSprints: Sprint[] = []) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    )
  }
  return render(
    <SprintLifecycleControls
      sprint={sprint}
      projectId="p-1"
      canManage={canManage}
      onEdit={() => {}}
      plannedSprints={plannedSprints}
    />,
    { wrapper: Wrapper },
  )
}

describe('SprintLifecycleControls', () => {
  it('shows Start (and hides Complete) for a Planned sprint when canManage', () => {
    renderControls(makeSprint({ status: 'Planned' }), true)
    expect(screen.getByRole('button', { name: 'Start sprint' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Complete sprint' })).not.toBeInTheDocument()
  })

  it('shows Complete (and hides Start) for an Active sprint when canManage', () => {
    renderControls(makeSprint({ status: 'Active' }), true)
    expect(screen.getByRole('button', { name: 'Complete sprint' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start sprint' })).not.toBeInTheDocument()
  })

  it('shows no action buttons for a Completed sprint', () => {
    renderControls(makeSprint({ status: 'Completed' }), true)
    expect(screen.queryByRole('button', { name: 'Start sprint' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Complete sprint' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('hides every action button when canManage is false', () => {
    renderControls(makeSprint({ status: 'Planned' }), false)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText('Planned')).toBeInTheDocument()
  })

  // Opening the Radix Select popover and clicking an option hangs under jsdom (no
  // ResizeObserver/layout support - the same documented limitation as CommentForm's canned-
  // response picker), so the destination-select path itself is covered by live smoke testing;
  // this only verifies the trigger/options render once the dialog is open.
  it('shows a destination picker with other Planned sprints once Complete sprint is clicked (Phase 2 gap-closure)', async () => {
    const user = userEvent.setup()
    const nextSprint = makeSprint({ id: 's-2', name: 'Sprint 2', status: 'Planned' })
    renderControls(makeSprint({ status: 'Active' }), true, [nextSprint])

    await user.click(screen.getByRole('button', { name: 'Complete sprint' }))

    expect(screen.getByLabelText('Move incomplete issues to')).toBeInTheDocument()
    expect(screen.getByText('Backlog')).toBeInTheDocument()
  })

  it('defaults the completion destination to the backlog (nextSprintId: null)', async () => {
    let sentBody: { nextSprintId: string | null } | null = null
    server.use(
      http.post(url('/projects/p-1/sprints/s-1/complete'), async ({ request }) => {
        sentBody = (await request.json()) as typeof sentBody
        return HttpResponse.json({ success: true, data: makeSprint({ status: 'Completed' }) })
      }),
    )
    const user = userEvent.setup()
    renderControls(makeSprint({ status: 'Active' }), true)

    await user.click(screen.getByRole('button', { name: 'Complete sprint' }))
    await user.click(screen.getByRole('button', { name: 'Complete' }))

    await waitFor(() => expect(sentBody).not.toBeNull())
    expect(sentBody).toEqual({ nextSprintId: null })
  })
})
