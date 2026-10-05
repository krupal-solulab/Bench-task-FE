import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, beforeEach } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { mockTasks } from '@/test/mocks/fixtures'
import { server } from '@/test/mocks/server'
import { CommandPalette } from './CommandPalette'
import { addRecentlyViewed } from '@/hooks/useRecentlyViewed'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function makeAuthValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: { id: 'u-1', name: 'Dev', email: 'dev@example.com', role: 'Developer' } as never,
    isAuthenticated: true,
    isLoading: false,
    login: async () => {},
    registerOrganization: async () => {},
    logout: async () => {},
    hasRole: (...roles) => roles.includes('Developer'),
    updateUser: () => {},
    ...overrides,
  }
}

function renderPalette(authValue: AuthContextValue = makeAuthValue(), initialEntry = '/dashboard') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  // ToastProvider mirrors the real app shell - Module 10's quick actions confirm with a toast.
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthContext.Provider value={authValue}>
            <MemoryRouter initialEntries={[initialEntry]}>
              <Routes>
                <Route path="*" element={children} />
              </Routes>
            </MemoryRouter>
          </AuthContext.Provider>
          <ToastViewport />
        </ToastProvider>
      </QueryClientProvider>
    )
  }
  return render(<CommandPalette />, { wrapper: Wrapper })
}

describe('CommandPalette', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('is closed until Ctrl+K is pressed (regression)', () => {
    renderPalette()
    expect(screen.queryByPlaceholderText(/Go to a page/)).not.toBeInTheDocument()
  })

  it('opens on Ctrl+K and shows role-visible nav items, hiding Admin-only ones for a Developer', async () => {
    const user = userEvent.setup()
    renderPalette()

    await user.keyboard('{Control>}k{/Control}')

    expect(await screen.findByPlaceholderText(/Go to a page/)).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Org Settings')).not.toBeInTheDocument()
  })

  it('shows Admin-only nav items for an Admin', async () => {
    const user = userEvent.setup()
    renderPalette(makeAuthValue({ hasRole: (...roles) => roles.includes('Admin') }))

    await user.keyboard('{Control>}k{/Control}')

    expect(await screen.findByText('Org Settings')).toBeInTheDocument()
  })

  it('toggles closed on a second Ctrl+K', async () => {
    const user = userEvent.setup()
    renderPalette()

    await user.keyboard('{Control>}k{/Control}')
    expect(await screen.findByPlaceholderText(/Go to a page/)).toBeInTheDocument()

    await user.keyboard('{Control>}k{/Control}')
    await waitFor(() =>
      expect(screen.queryByPlaceholderText(/Go to a page/)).not.toBeInTheDocument(),
    )
  })

  it('filters nav results as the query changes', async () => {
    const user = userEvent.setup()
    renderPalette()
    await user.keyboard('{Control>}k{/Control}')
    const input = await screen.findByPlaceholderText(/Go to a page/)

    await user.type(input, 'roadmap')

    expect(screen.getByText('Roadmap')).toBeInTheDocument()
    expect(screen.queryByText('Projects')).not.toBeInTheDocument()
  })

  it('shows recently-viewed items when the query is empty', async () => {
    addRecentlyViewed({ id: 't-1', type: 'task', label: 'PRJ-1 Ship it', path: '/tasks/t-1' })
    const user = userEvent.setup()
    renderPalette()

    await user.keyboard('{Control>}k{/Control}')

    expect(await screen.findByText('Recently viewed')).toBeInTheDocument()
    expect(screen.getByText('PRJ-1 Ship it')).toBeInTheDocument()
  })

  it('searches issues by title once the query is at least 2 characters', async () => {
    server.use(
      http.get(url('/tasks/search'), ({ request }) => {
        const jql = new URL(request.url).searchParams.get('jql')
        expect(jql).toContain('login')
        return HttpResponse.json({
          success: true,
          data: [
            {
              id: 't-9',
              issueKey: 'PRJ-9',
              title: 'Fix login bug',
              project: { id: 'p-1', name: 'Proj' },
              status: 'Todo',
              statusCategory: 'To Do',
            },
          ],
          meta: {
            total: 1,
            page: 1,
            limit: 8,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        })
      }),
    )
    const user = userEvent.setup()
    renderPalette()
    await user.keyboard('{Control>}k{/Control}')
    const input = await screen.findByPlaceholderText(/Go to a page/)

    await user.type(input, 'login')

    expect(await screen.findByText('Fix login bug')).toBeInTheDocument()
    expect(screen.getByText('PRJ-9')).toBeInTheDocument()
  })

  describe('quick actions on an issue page (Module 10 gap-closure)', () => {
    const task = { ...mockTasks[0]!, assignee: null, watcherIds: [], status: 'Todo' }

    function mockTask() {
      server.use(
        http.get(url(`/tasks/${task.id}`), () => HttpResponse.json({ success: true, data: task })),
      )
    }

    it('offers Assign to me, Watch, the next statuses and Copy link - only on an issue page', async () => {
      mockTask()
      const user = userEvent.setup()
      renderPalette(makeAuthValue(), `/tasks/${task.id}`)
      await user.keyboard('{Control>}k{/Control}')

      expect(await screen.findByRole('button', { name: /Assign to me/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^Watch/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Move to In Progress/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Copy link to this issue/ })).toBeInTheDocument()
    })

    it('runs an action through the normal API and confirms with a toast', async () => {
      mockTask()
      let sent: unknown = null
      server.use(
        http.patch(url(`/tasks/${task.id}/assignee`), async ({ request }) => {
          sent = await request.json()
          return HttpResponse.json({ success: true, data: { ...task, assignee: { id: 'u-1' } } })
        }),
      )
      const user = userEvent.setup()
      renderPalette(makeAuthValue(), `/tasks/${task.id}`)
      await user.keyboard('{Control>}k{/Control}')
      await user.click(await screen.findByRole('button', { name: /Assign to me/ }))

      await waitFor(() => expect(sent).toEqual({ assignee: 'u-1' }))
      expect(await screen.findByText(/assigned to you/)).toBeInTheDocument()
    })

    it('shows no actions away from an issue page (regression)', async () => {
      const user = userEvent.setup()
      renderPalette()
      await user.keyboard('{Control>}k{/Control}')
      await screen.findByPlaceholderText(/Go to a page/)
      expect(screen.queryByText('Actions')).not.toBeInTheDocument()
    })
  })
})
