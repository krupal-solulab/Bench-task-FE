import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { TransitionPreviewButton } from '@/components/tasks/TransitionPreviewButton'
import { TaskActivityFeed } from '@/components/tasks/TaskActivityFeed'
import { describeFieldChange, fieldLabel } from '@/lib/field-labels'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`
const ok = <T,>(data: T) => ({ success: true, data })

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

const noApproval = {
  requiresApproval: false,
  requiredApprovals: 0,
  approverRoles: [],
  approverUserCount: 0,
  approverTeamCount: 0,
  approverProjectRoleCount: 0,
}

describe('field-level audit trail labels (Module 12 gap-closure)', () => {
  it('names built-in and custom fields', () => {
    expect(fieldLabel('labels')).toBe('Labels')
    expect(fieldLabel('cf-1', { 'cf-1': 'Budget' })).toBe('Budget')
    expect(fieldLabel('cf-unknown')).toBe('a custom field')
  })

  it('shows old -> new, but never a hidden value or a long description', () => {
    expect(describeFieldChange({ field: 'labels', from: null, to: 'api' })).toBe(
      'changed Labels: none → api',
    )
    expect(describeFieldChange({ field: 'description', from: 'a', to: 'b' })).toBe(
      'changed Description',
    )
    expect(
      describeFieldChange(
        { field: 'cf-1', from: null, to: null, redacted: true },
        { 'cf-1': 'Budget' },
      ),
    ).toBe('changed Budget')
  })
})

describe('task activity feed - field changes (Module 12 gap-closure)', () => {
  it('renders per-field entries alongside generic legacy ones', async () => {
    const actor = { id: 'u-1', name: 'Dana Dev', email: 'd@example.com', role: 'Developer' }
    const entry = (overrides: Record<string, unknown>) => ({
      action: 'updated',
      from: null,
      to: null,
      actor,
      viaAutomationRule: null,
      createdAt: '2026-10-01T10:00:00.000Z',
      ...overrides,
    })
    server.use(
      http.get(url('/tasks/t-1/activity'), () =>
        HttpResponse.json({
          success: true,
          data: [
            entry({ id: 'a-1', field: 'title', from: 'Old title', to: 'New title' }),
            entry({ id: 'a-2', field: 'cf-1', redacted: true }),
            entry({ id: 'a-3' }),
          ],
          meta: { page: 1, limit: 20, total: 3, totalPages: 1 },
        }),
      ),
    )
    const user = userEvent.setup()
    render(<TaskActivityFeed taskId="t-1" customFieldNames={{ 'cf-1': 'Budget' }} />, {
      wrapper: wrapper(),
    })
    await user.click(screen.getByRole('button', { name: /activity/i }))
    expect(await screen.findByText(/changed Title: Old title → New title/)).toBeInTheDocument()
    expect(screen.getByText(/changed Budget/)).toBeInTheDocument()
    expect(screen.getByText(/updated the task/)).toBeInTheDocument()
  })
})

describe('transition preview / workflow dry-run (Module 12 gap-closure)', () => {
  it('lists each next status with blockers, approvals and automations', async () => {
    server.use(
      http.get(url('/tasks/t-1/transitions/preview'), () =>
        HttpResponse.json(
          ok({
            currentStatus: 'Building',
            pendingApprovalTo: null,
            transitions: [
              {
                toStatus: 'Shipped',
                category: 'Done',
                allowed: true,
                blockers: [],
                requiresApproval: true,
                requiredApprovals: 2,
                approverRoles: ['Manager'],
                approverUserCount: 1,
                approverTeamCount: 0,
                approverProjectRoleCount: 0,
                automations: [
                  {
                    ruleName: 'Celebrate',
                    trigger: 'StatusChanged',
                    actionType: 'AddLabels',
                    value: 'shipped',
                    whenApproved: true,
                  },
                ],
              },
              {
                ...noApproval,
                toStatus: 'Backlog',
                category: 'To Do',
                allowed: false,
                blockers: ['Only Admin can make this transition'],
                automations: [],
              },
            ],
          }),
        ),
      ),
    )
    const user = userEvent.setup()
    render(<TransitionPreviewButton taskId="t-1" />, { wrapper: wrapper() })
    await user.click(screen.getByRole('button', { name: /preview transitions/i }))

    const shipped = await screen.findByLabelText('Transition to Shipped')
    expect(within(shipped).getByText('You can make this move')).toBeInTheDocument()
    expect(
      within(shipped).getByText(/Needs 2 approvals from Manager, 1 named user/),
    ).toBeInTheDocument()
    expect(
      within(shipped).getByText(/Automation "Celebrate" - AddLabels shipped \(once approved\)/),
    ).toBeInTheDocument()

    const backlog = screen.getByLabelText('Transition to Backlog')
    expect(within(backlog).getByText('Blocked')).toBeInTheDocument()
    expect(within(backlog).getByText('Only Admin can make this transition')).toBeInTheDocument()
  })

  it('does not fetch anything until opened', async () => {
    let calls = 0
    server.use(
      http.get(url('/tasks/t-2/transitions/preview'), () => {
        calls += 1
        return HttpResponse.json(
          ok({ currentStatus: 'Todo', pendingApprovalTo: null, transitions: [] }),
        )
      }),
    )
    const user = userEvent.setup()
    render(<TransitionPreviewButton taskId="t-2" />, { wrapper: wrapper() })
    expect(calls).toBe(0)
    await user.click(screen.getByRole('button', { name: /preview transitions/i }))
    expect(await screen.findByText(/no transitions out of this status/)).toBeInTheDocument()
    expect(calls).toBe(1)
  })
})
