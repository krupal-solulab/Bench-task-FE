import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { server } from '@/test/mocks/server'
import { mockUsers } from '@/test/mocks/fixtures'
import { KeyboardShortcutsDialog } from '@/components/layout/KeyboardShortcutsDialog'
import { TimeZoneSettings } from '@/components/profile/TimeZoneSettings'
import { NotificationsPage } from '@/pages/NotificationsPage'
import { SearchResultsPage } from '@/pages/SearchResultsPage'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function wrapper(initialEntry = '/', authOverrides: Partial<AuthContextValue> = {}) {
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
    ...authOverrides,
  }
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <ToastProvider>
            <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
            <ToastViewport />
          </ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}

describe('Keyboard shortcut cheat-sheet (Module 11 gap-closure)', () => {
  it('opens on "?" and lists the shortcuts, but never while typing in a field', async () => {
    const user = userEvent.setup()
    render(
      <>
        <input aria-label="Some field" />
        <KeyboardShortcutsDialog />
      </>,
    )
    await user.click(screen.getByLabelText('Some field'))
    await user.keyboard('?')
    expect(screen.queryByText('Keyboard shortcuts')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Some field')).toHaveValue('?')

    await user.click(document.body)
    await user.keyboard('?')
    expect(await screen.findByText('Keyboard shortcuts')).toBeInTheDocument()
    expect(
      screen.getByText('Open the command palette (go to, search, actions)'),
    ).toBeInTheDocument()
  })
})

describe('Grouped notifications (Module 11 gap-closure)', () => {
  it('shows day sections and bundles same-issue notifications behind "+N more"', async () => {
    const now = Date.now()
    const item = (id: string, minutesAgo: number, taskId: string | null, title: string) => ({
      id,
      type: 'CommentAdded',
      title,
      message: '',
      taskId,
      projectId: null,
      read: false,
      createdAt: new Date(now - minutesAgo * 60_000).toISOString(),
    })
    server.use(
      http.get(url('/notifications'), () =>
        HttpResponse.json({
          success: true,
          data: [
            item('n1', 1, 't-1', 'Newest on issue one'),
            item('n2', 2, 't-2', 'Issue two update'),
            item('n3', 3, 't-1', 'Older on issue one'),
            item('n4', 60 * 24 * 40, 't-9', 'Very old'),
          ],
          meta: {
            total: 4,
            page: 1,
            limit: 20,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        }),
      ),
    )
    const user = userEvent.setup()
    render(<NotificationsPage />, { wrapper: wrapper('/notifications') })

    expect(await screen.findByRole('heading', { name: 'Today' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Earlier' })).toBeInTheDocument()
    expect(screen.queryByText('Older on issue one')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '+1 more update on this issue' }))
    expect(screen.getByText('Older on issue one')).toBeInTheDocument()
  })
})

describe('Comments in global search (Module 11 gap-closure)', () => {
  it('lists matching comments with their issue and author', async () => {
    server.use(
      http.get(url('/search'), () =>
        HttpResponse.json({
          success: true,
          data: {
            tasks: [],
            projects: [],
            users: [],
            comments: [
              {
                id: 'c-1',
                snippet: 'We hit the Kafka outage again',
                task: { id: 't-1', issueKey: 'WEB-1', title: 'Broker sync' },
                author: { id: 'u-1', name: 'Ada Admin' },
                createdAt: new Date().toISOString(),
              },
            ],
          },
        }),
      ),
    )
    render(<SearchResultsPage />, { wrapper: wrapper('/search?q=kafka') })
    expect(await screen.findByText('Comments (1)')).toBeInTheDocument()
    expect(screen.getByText('We hit the Kafka outage again')).toBeInTheDocument()
    expect(screen.getByText(/WEB-1 · Broker sync · Ada Admin/)).toBeInTheDocument()
  })
})

describe('Time zone setting (Module 11 gap-closure)', () => {
  it('saves the chosen zone through PATCH /auth/me and updates the signed-in user', async () => {
    let sent: unknown = null
    const updated = { ...mockUsers[0]!, timezone: 'Asia/Kolkata' }
    server.use(
      http.patch(url('/auth/me'), async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ success: true, data: updated })
      }),
    )
    const updateUser = vi.fn()
    const user = userEvent.setup()
    render(<TimeZoneSettings />, { wrapper: wrapper('/', { updateUser }) })

    await user.selectOptions(screen.getByLabelText('Time zone'), 'Asia/Kolkata')
    await waitFor(() => expect(sent).toEqual({ timezone: 'Asia/Kolkata' }))
    expect(updateUser).toHaveBeenCalledWith(updated)
    expect(await screen.findByText('Time zone updated')).toBeInTheDocument()
  })
})
