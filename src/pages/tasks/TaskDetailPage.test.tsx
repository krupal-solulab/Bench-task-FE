import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { server } from '@/test/mocks/server'
import { mockUsers } from '@/test/mocks/fixtures'
import { TaskDetailPage } from '@/pages/tasks/TaskDetailPage'

vi.mock('@/hooks/useSocket', () => ({
  useSocket: () => ({ joinProject: vi.fn(), leaveProject: vi.fn() }),
}))

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

beforeEach(() => {
  // Not covered by the shared MSW handlers - AttachmentList fetches this unconditionally as
  // soon as the task loads, so it must be stubbed for TaskDetailPage to render without error.
  server.use(
    http.get(url('/tasks/:taskId/attachments'), () =>
      HttpResponse.json({
        success: true,
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 50,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      }),
    ),
  )
})

const ADMIN = mockUsers[0]! // Ada Admin
const ASSIGNEE = mockUsers[2]! // Dev One - assignee of task t-1
const OTHER_DEV = mockUsers[3]! // Dev Two - not the assignee

function makeAuthValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: ADMIN,
    isAuthenticated: true,
    isLoading: false,
    login: async () => {},
    registerOrganization: async () => {},
    logout: async () => {},
    hasRole: (...roles) => roles.includes('Admin'),
    ...overrides,
  }
}

function renderTaskDetail(authValue: AuthContextValue) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/tasks/t-1']}>
          <ToastProvider>
            <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
          </ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
  return render(
    <Routes>
      <Route path="/tasks/:id" element={<TaskDetailPage />} />
    </Routes>,
    { wrapper: Wrapper },
  )
}

describe('TaskDetailPage', () => {
  it('renders the task title and shows Edit/Delete for an Admin', async () => {
    renderTaskDetail(makeAuthValue({ user: ADMIN, hasRole: (...roles) => roles.includes('Admin') }))

    await waitFor(() => expect(screen.getByText('Design homepage hero')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('hides Edit/Delete for a Developer who is not the assignee', async () => {
    renderTaskDetail(makeAuthValue({ user: OTHER_DEV, hasRole: () => false }))

    await waitFor(() => expect(screen.getByText('Design homepage hero')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it("shows the assignee's name for a Developer viewing their own assigned task", async () => {
    renderTaskDetail(makeAuthValue({ user: ASSIGNEE, hasRole: () => false }))

    await waitFor(() => expect(screen.getByText('Design homepage hero')).toBeInTheDocument())
    expect(screen.getAllByText(ASSIGNEE.name).length).toBeGreaterThan(0)
  })

  it('links back to the parent project', async () => {
    renderTaskDetail(makeAuthValue())

    await waitFor(() => expect(screen.getByText('Design homepage hero')).toBeInTheDocument())
    const projectLink = screen.getByRole('link', { name: 'Website Revamp' })
    expect(projectLink).toHaveAttribute('href', '/projects/p-1')
  })
})
