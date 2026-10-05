import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { server } from '@/test/mocks/server'
import { mockProjects, mockUsers } from '@/test/mocks/fixtures'
import { TaskForm } from '@/components/tasks/TaskForm'
import { RiskBadge, RiskReasons } from '@/components/tasks/RiskBadge'
import { AtRiskIssuesCard } from '@/components/projects/AtRiskIssuesCard'

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

const project = mockProjects[0]!

describe('TaskForm - Module 10 gap-closure', () => {
  it('drafts title, type and priority from a free-text description', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<TaskForm projectId={project.id} onSubmit={onSubmit} onCancel={vi.fn()} />, {
      wrapper: wrapper(),
    })

    await user.click(screen.getByText('Draft from a description (suggested)'))
    // Paste rather than type key-by-key - same behaviour, fast enough under full-suite load.
    await user.click(screen.getByLabelText('Describe the issue in your own words'))
    await user.paste('Urgent: checkout crashes on Safari when the cart is empty')
    await user.click(screen.getByRole('button', { name: 'Draft fields' }))

    expect(screen.getByLabelText('Title', { exact: false })).toHaveValue(
      'Checkout crashes on Safari when the cart is empty',
    )
    expect(screen.getByText(/review before creating/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0]![0]).toEqual(expect.objectContaining({ priority: 'P1' }))
  })

  it('lists scored similar issues as links while typing a title', async () => {
    let sentQuery: URLSearchParams | null = null
    server.use(
      http.get(url('/tasks/similar'), ({ request }) => {
        sentQuery = new URL(request.url).searchParams
        return HttpResponse.json({
          success: true,
          data: [
            {
              id: 't-9',
              issueKey: 'WEB-9',
              title: 'Login page crashes on Safari',
              status: 'Todo',
              statusCategory: 'To Do',
              score: 0.82,
            },
          ],
        })
      }),
    )
    const user = userEvent.setup()
    render(<TaskForm projectId={project.id} onSubmit={vi.fn()} onCancel={vi.fn()} />, {
      wrapper: wrapper(),
    })
    await user.type(screen.getByLabelText('Title', { exact: false }), 'Safari login crash')

    expect(await screen.findByText('82% match', {}, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /WEB-9/ })).toHaveAttribute('href', '/tasks/t-9')
    expect(sentQuery!.get('project')).toBe(project.id)
    expect(sentQuery!.get('text')).toBe('Safari login crash')
  })
})

describe('Risk flagging UI - Module 10 gap-closure', () => {
  it('shows a High risk badge with its reasons, and nothing for a healthy issue', async () => {
    server.use(
      http.get(url('/tasks/t-1/risk'), () =>
        HttpResponse.json({
          success: true,
          data: {
            score: 5,
            level: 'high',
            reasons: ['Overdue by 2 days', 'High priority with nobody assigned'],
          },
        }),
      ),
    )
    const { rerender } = render(
      <>
        <RiskBadge taskId="t-1" />
        <RiskReasons taskId="t-1" />
      </>,
      { wrapper: wrapper() },
    )
    expect(await screen.findByText('High risk')).toBeInTheDocument()
    expect(screen.getByText('• Overdue by 2 days')).toBeInTheDocument()

    rerender(<RiskBadge taskId="t-2" />) // default handler: score 0
    await waitFor(() => expect(screen.queryByText(/risk$/)).not.toBeInTheDocument())
  })

  it("lists the project's at-risk issues with reasons and links", async () => {
    server.use(
      http.get(url('/tasks/at-risk'), () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: 't-3',
              issueKey: 'WEB-3',
              title: 'Needs the API',
              status: 'Todo',
              priority: 'P2',
              dueDate: null,
              assignee: null,
              risk: { score: 2, level: 'medium', reasons: ['Blocked by WEB-1'] },
            },
          ],
        }),
      ),
    )
    render(<AtRiskIssuesCard projectId={project.id} />, { wrapper: wrapper() })
    expect(await screen.findByRole('link', { name: /WEB-3 Needs the API/ })).toHaveAttribute(
      'href',
      '/tasks/t-3',
    )
    expect(screen.getByText('Blocked by WEB-1')).toBeInTheDocument()
  })
})
