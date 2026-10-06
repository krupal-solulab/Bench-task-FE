import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { server } from '@/test/mocks/server'
import { mockTasks, mockUsers } from '@/test/mocks/fixtures'
import { TaskApprovalActions } from './TaskApprovalActions'
import type { Task } from '@/types/task.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function makeTask(overrides: Partial<Task> = {}): Task {
  return { ...mockTasks[0]!, id: 't-1', pendingApproval: null, ...overrides }
}

const MANAGER = mockUsers[1]!

const authValue: AuthContextValue = {
  user: MANAGER,
  isAuthenticated: true,
  isLoading: false,
  login: async () => {},
  registerOrganization: async () => {},
  logout: async () => {},
  hasRole: () => true,
  updateUser: () => {},
}

function renderActions(task: Task) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
          <ToastViewport />
        </ToastProvider>
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

  // Module 12 gap-closure: multi-approver requests.
  it('shows approval progress and disables Approve once the viewer has approved', () => {
    renderActions(
      makeTask({
        pendingApproval: {
          toStatus: 'Shipped',
          requestedBy: 'u-2',
          requestedAt: '2026-01-01T00:00:00.000Z',
          approverRoles: ['Manager', 'Admin'],
          approverUserIds: [],
          approverTeamIds: [],
          approverProjectRoleIds: [],
          requiredApprovals: 2,
          approvals: [{ user: MANAGER.id, at: '2026-01-02T00:00:00.000Z' }],
        },
      }),
    )
    expect(screen.getByLabelText('Approval progress')).toHaveTextContent('1 of 2 approvals')
    expect(screen.getByRole('button', { name: /approved/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /reject/i })).toBeEnabled()
  })

  it('reports a recorded (not yet final) approval', async () => {
    const pending = {
      toStatus: 'Shipped',
      requestedBy: 'u-2',
      requestedAt: '2026-01-01T00:00:00.000Z',
      approverRoles: ['Manager' as const],
      approverUserIds: [],
      approverTeamIds: [],
      approverProjectRoleIds: [],
      requiredApprovals: 2,
      approvals: [],
    }
    const task = makeTask({ pendingApproval: pending })
    server.use(
      http.post(url('/tasks/t-1/approval/approve'), () =>
        HttpResponse.json({
          success: true,
          data: {
            ...task,
            pendingApproval: {
              ...pending,
              approvals: [{ user: MANAGER.id, at: '2026-01-02T00:00:00.000Z' }],
            },
          },
        }),
      ),
    )
    const user = userEvent.setup()
    renderActions(task)
    expect(screen.getByLabelText('Approval progress')).toHaveTextContent('0 of 2 approvals')
    await user.click(screen.getByRole('button', { name: /approve/i }))
    expect(await screen.findByText('Approval recorded - 1 of 2')).toBeInTheDocument()
  })
})
