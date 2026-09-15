import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { renderWithProviders, screen as providerScreen } from '@/test/utils/render'
import { server } from '@/test/mocks/server'
import { mockUsers } from '@/test/mocks/fixtures'
import { DashboardPage } from './DashboardPage'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

const ADMIN = mockUsers[0]!
const DEV = mockUsers[2]!

function makeAuthValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: ADMIN,
    isAuthenticated: true,
    isLoading: false,
    login: async () => {},
    registerOrganization: async () => {},
    logout: async () => {},
    hasRole: () => false,
    ...overrides,
  }
}

function renderAs(authValue: AuthContextValue) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <ToastProvider>
            <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
          </ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
  return render(<DashboardPage />, { wrapper: Wrapper })
}

function headingOrder() {
  return screen
    .getAllByRole('heading', { level: 3 })
    .map((h) => h.textContent)
    .filter((t): t is string => !!t)
}

describe('DashboardPage', () => {
  it('renders the page heading', () => {
    renderWithProviders(<DashboardPage />)
    expect(providerScreen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('with no saved preference, renders every widget an Admin can see in the default order (regression)', async () => {
    renderAs(makeAuthValue({ user: ADMIN }))

    await screen.findByText('Projects by status')
    expect(headingOrder()).toEqual([
      'Projects by status',
      'Task status',
      'Tasks by priority',
      'Task trend',
      'Developer workload',
      'Overdue tasks',
    ])
  })

  it('a saved preference hides and reorders widgets', async () => {
    server.use(
      http.get(url('/dashboard/preferences'), () =>
        HttpResponse.json({
          success: true,
          data: { hiddenWidgets: ['overdueList'], widgetOrder: ['taskTrend', 'tasksStatus'] },
        }),
      ),
    )
    renderAs(makeAuthValue({ user: ADMIN }))

    // The preferences fetch resolves independently of the widgets' own queries, so "Task trend"
    // appears in the DOM under the default order too, briefly, before the stored order applies -
    // wait for the actual customized order rather than a one-shot text match.
    await waitFor(() => {
      const order = headingOrder()
      expect(order.indexOf('Task trend')).toBe(0)
      expect(order.indexOf('Task status')).toBe(1)
    })
    expect(headingOrder()).not.toContain('Overdue tasks')
  })

  it('never shows Developer Workload to a Developer, even if a (tampered) stored preference includes it', async () => {
    server.use(
      http.get(url('/dashboard/preferences'), () =>
        HttpResponse.json({
          success: true,
          data: { hiddenWidgets: [], widgetOrder: ['developerWorkload', 'tasksStatus'] },
        }),
      ),
    )
    renderAs(makeAuthValue({ user: DEV, hasRole: () => false }))

    await screen.findByText('Task status')
    expect(screen.queryByText('Developer workload')).not.toBeInTheDocument()
  })
})
