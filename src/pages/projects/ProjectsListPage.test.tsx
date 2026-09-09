import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { server } from '@/test/mocks/server'
import { mockUsers } from '@/test/mocks/fixtures'
import { ProjectsListPage } from '@/pages/projects/ProjectsListPage'

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

function renderPage(authValue: AuthContextValue) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/projects']}>
          <ToastProvider>
            <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
          </ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
  return render(<ProjectsListPage />, { wrapper: Wrapper })
}

describe('ProjectsListPage', () => {
  it('renders projects fetched from the API', async () => {
    renderPage(makeAuthValue({ user: ADMIN }))
    await waitFor(() => expect(screen.getByText('Website Revamp')).toBeInTheDocument())
    expect(screen.getByText('Mobile App')).toBeInTheDocument()
  })

  it('shows the New Project action to an Admin', async () => {
    renderPage(makeAuthValue({ user: ADMIN, hasRole: (...roles) => roles.includes('Admin') }))
    await waitFor(() => expect(screen.getByText('Website Revamp')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /New Project/ })).toBeInTheDocument()
  })

  it('hides the New Project action from a Developer', async () => {
    renderPage(makeAuthValue({ user: DEV, hasRole: () => false }))
    await waitFor(() => expect(screen.getByText('Website Revamp')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /New Project/ })).not.toBeInTheDocument()
  })

  it('shows an empty state when there are no projects', async () => {
    server.use(
      http.get(url('/projects'), () =>
        HttpResponse.json({
          success: true,
          data: [],
          meta: {
            total: 0,
            page: 1,
            limit: 20,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        }),
      ),
    )
    renderPage(makeAuthValue())
    expect(await screen.findByText('No projects yet')).toBeInTheDocument()
  })

  it('switches to table view', async () => {
    const user = userEvent.setup()
    renderPage(makeAuthValue())

    await waitFor(() => expect(screen.getByText('Website Revamp')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Table view' }))

    expect(screen.getByRole('table')).toBeInTheDocument()
  })
})
