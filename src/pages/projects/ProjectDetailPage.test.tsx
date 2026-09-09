import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { server } from '@/test/mocks/server'
import { mockUsers } from '@/test/mocks/fixtures'
import { ProjectDetailPage } from '@/pages/projects/ProjectDetailPage'

vi.mock('@/hooks/useSocket', () => ({
  useSocket: () => ({ joinProject: vi.fn(), leaveProject: vi.fn() }),
}))

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

const ADMIN = mockUsers[0]! // Ada Admin
const MANAGER = mockUsers[1]! // Mona Manager - owns project p-1
const OTHER_DEV = mockUsers[3]! // Dev Two - a project member, not the owner

beforeEach(() => {
  server.use(
    http.get(url('/projects/:id/stats'), () =>
      HttpResponse.json({
        success: true,
        data: {
          totalTasks: 2,
          tasksByStatus: {},
          tasksByPriority: {},
          overdueCount: 0,
          completionRate: 50,
        },
      }),
    ),
  )
})

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

function renderProjectDetail(authValue: AuthContextValue) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/projects/p-1']}>
          <ToastProvider>
            <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
          </ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
  return render(
    <Routes>
      <Route path="/projects/:id" element={<ProjectDetailPage />} />
    </Routes>,
    { wrapper: Wrapper },
  )
}

describe('ProjectDetailPage', () => {
  it('renders the project name and owner, and shows Edit/Delete for an Admin', async () => {
    renderProjectDetail(
      makeAuthValue({ user: ADMIN, hasRole: (...roles) => roles.includes('Admin') }),
    )

    await waitFor(() => expect(screen.getByText('Website Revamp')).toBeInTheDocument())
    expect(screen.getByText('Mona Manager', { exact: false })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('shows Edit/Delete for the owning Manager', async () => {
    renderProjectDetail(
      makeAuthValue({ user: MANAGER, hasRole: (...roles) => roles.includes('Manager') }),
    )
    await waitFor(() => expect(screen.getByText('Website Revamp')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })

  it('hides Edit/Delete from a member Developer who does not own the project', async () => {
    renderProjectDetail(makeAuthValue({ user: OTHER_DEV, hasRole: () => false }))

    await waitFor(() => expect(screen.getByText('Website Revamp')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'New Task' })).not.toBeInTheDocument()
  })

  it('switches to the Members tab and shows project members', async () => {
    const user = userEvent.setup()
    renderProjectDetail(makeAuthValue())

    await waitFor(() => expect(screen.getByText('Website Revamp')).toBeInTheDocument())
    await user.click(screen.getByRole('tab', { name: 'Members' }))

    expect(await screen.findAllByText('Mona Manager')).not.toHaveLength(0)
  })

  it('shows the task board with fetched tasks by default', async () => {
    renderProjectDetail(makeAuthValue())

    await waitFor(() => expect(screen.getByText('Website Revamp')).toBeInTheDocument())
    expect(await screen.findByText('Design homepage hero')).toBeInTheDocument()
  })
})
