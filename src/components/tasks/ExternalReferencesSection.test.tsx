import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { server } from '@/test/mocks/server'
import { mockTasks, mockUsers } from '@/test/mocks/fixtures'
import { ExternalReferencesSection } from './ExternalReferencesSection'
import type { ExternalReference, Task } from '@/types/task.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

const CURRENT_USER = mockUsers[2]! // Dev One
const OTHER_USER = mockUsers[3]! // Dev Two

function makeReference(overrides: Partial<ExternalReference> = {}): ExternalReference {
  return {
    id: 'ref-1',
    label: 'PR #42',
    url: 'https://github.com/acme/repo/pull/42',
    addedBy: CURRENT_USER,
    addedAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return { ...mockTasks[0]!, externalReferences: [], ...overrides }
}

function makeAuthValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: CURRENT_USER,
    isAuthenticated: true,
    isLoading: false,
    login: async () => {},
    registerOrganization: async () => {},
    logout: async () => {},
    hasRole: () => false,
    updateUser: () => {},
    ...overrides,
  }
}

function renderSection(task: Task, authValue: AuthContextValue = makeAuthValue()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
        </ToastProvider>
      </QueryClientProvider>
    )
  }
  return render(<ExternalReferencesSection task={task} />, { wrapper: Wrapper })
}

describe('ExternalReferencesSection (Module 7 gap-closure)', () => {
  it('shows an empty state when there are no references yet', () => {
    renderSection(makeTask())
    expect(screen.getByText(/No external references yet/)).toBeInTheDocument()
  })

  it('lists existing references as links, with the person who added each one', () => {
    renderSection(makeTask({ externalReferences: [makeReference()] }))
    const link = screen.getByRole('link', { name: /PR #42/ })
    expect(link).toHaveAttribute('href', 'https://github.com/acme/repo/pull/42')
    expect(link).toHaveAttribute('target', '_blank')
    expect(screen.getByText(CURRENT_USER.name)).toBeInTheDocument()
  })

  it('shows a remove button for the reference author, but not for another viewer', () => {
    const task = makeTask({ externalReferences: [makeReference({ addedBy: CURRENT_USER })] })
    const { unmount } = renderSection(task, makeAuthValue({ user: CURRENT_USER }))
    expect(screen.getByLabelText('Remove reference PR #42')).toBeInTheDocument()
    unmount()

    renderSection(task, makeAuthValue({ user: OTHER_USER }))
    expect(screen.queryByLabelText('Remove reference PR #42')).not.toBeInTheDocument()
  })

  it("shows a remove button for a same-org Admin viewing someone else's reference", () => {
    const task = makeTask({ externalReferences: [makeReference({ addedBy: OTHER_USER })] })
    renderSection(
      task,
      makeAuthValue({ user: CURRENT_USER, hasRole: (...roles) => roles.includes('Admin') }),
    )
    expect(screen.getByLabelText('Remove reference PR #42')).toBeInTheDocument()
  })

  it('posts label and url to the add endpoint', async () => {
    const task = makeTask({ id: 't-1' })
    let receivedBody: unknown
    server.use(
      http.post(url('/tasks/t-1/external-references'), async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({
          success: true,
          data: { ...task, externalReferences: [makeReference()] },
        })
      }),
    )
    const user = userEvent.setup()
    renderSection(task)

    await user.type(screen.getByLabelText('Reference label'), 'PR #42')
    await user.type(screen.getByLabelText('Reference URL'), 'https://github.com/acme/repo/pull/42')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() =>
      expect(receivedBody).toEqual({
        label: 'PR #42',
        url: 'https://github.com/acme/repo/pull/42',
      }),
    )
  })

  it('calls the delete endpoint when removing a reference', async () => {
    const task = makeTask({ id: 't-1', externalReferences: [makeReference()] })
    let called = false
    server.use(
      http.delete(url('/tasks/t-1/external-references/ref-1'), () => {
        called = true
        return HttpResponse.json({ success: true, data: { ...task, externalReferences: [] } })
      }),
    )
    const user = userEvent.setup()
    renderSection(task)

    await user.click(screen.getByLabelText('Remove reference PR #42'))

    await waitFor(() => expect(called).toBe(true))
  })
})
