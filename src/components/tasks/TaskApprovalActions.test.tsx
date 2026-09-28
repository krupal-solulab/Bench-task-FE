import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { server } from '@/test/mocks/server'
import { mockTasks } from '@/test/mocks/fixtures'
import { TaskApprovalActions } from './TaskApprovalActions'
import type { Task } from '@/types/task.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function makeTask(overrides: Partial<Task> = {}): Task {
  return { ...mockTasks[0]!, id: 't-1', pendingApproval: null, ...overrides }
}

function renderActions(task: Task) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    )
  }
  return render(<TaskApprovalActions task={task} />, { wrapper: Wrapper })
}

describe('TaskApprovalActions (Module 12)', () => {
  it('renders nothing when the task has no transition pending approval', () => {
    renderActions(makeTask())
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument()
  })

  it('shows Approve/Reject when a transition is pending, and calls the approve endpoint', async () => {
    const task = makeTask({
      pendingApproval: {
        toStatus: 'Shipped',
        requestedBy: 'u-2',
        requestedAt: '2026-01-01T00:00:00.000Z',
        approverRoles: ['Manager'],
        approverUserIds: [],
        approverTeamIds: [],
        approverProjectRoleIds: [],
      },
    })
    let called = false
    server.use(
      http.post(url('/tasks/t-1/approval/approve'), () => {
        called = true
        return HttpResponse.json({
          success: true,
          data: { ...task, status: 'Shipped', pendingApproval: null },
        })
      }),
    )
    const user = userEvent.setup()
    renderActions(task)

    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /approve/i }))

    await waitFor(() => expect(called).toBe(true))
  })

  it('calls the reject endpoint when Reject is clicked', async () => {
    const task = makeTask({
      pendingApproval: {
        toStatus: 'Shipped',
        requestedBy: 'u-2',
        requestedAt: '2026-01-01T00:00:00.000Z',
        approverRoles: ['Manager'],
        approverUserIds: [],
        approverTeamIds: [],
        approverProjectRoleIds: [],
      },
    })
    let called = false
    server.use(
      http.post(url('/tasks/t-1/approval/reject'), () => {
        called = true
        return HttpResponse.json({ success: true, data: { ...task, pendingApproval: null } })
      }),
    )
    const user = userEvent.setup()
    renderActions(task)

    await user.click(screen.getByRole('button', { name: /reject/i }))

    await waitFor(() => expect(called).toBe(true))
  })
})
