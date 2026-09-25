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
import { WatchVoteButtons } from './WatchVoteButtons'
import type { Task } from '@/types/task.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

const CURRENT_USER = mockUsers[2]! // Dev One
const OTHER_USER = mockUsers[3]! // Dev Two

function makeTask(overrides: Partial<Task> = {}): Task {
  return { ...mockTasks[0]!, watcherIds: [], voterIds: [], ...overrides }
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
    ...overrides,
  }
}

function renderButtons(task: Task, authValue: AuthContextValue = makeAuthValue()) {
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
  return render(<WatchVoteButtons task={task} />, { wrapper: Wrapper })
}

describe('WatchVoteButtons (Module 7)', () => {
  it('shows the current watcher/voter counts', () => {
    renderButtons(makeTask({ watcherIds: [CURRENT_USER, OTHER_USER], voterIds: [OTHER_USER] }))
    expect(screen.getByTitle('Stop watching')).toHaveTextContent('2')
    expect(screen.getByTitle('Vote for this issue')).toHaveTextContent('1')
  })

  it('shows "Start watching" / "Vote" when the current user is not in either list', () => {
    renderButtons(makeTask())
    expect(screen.getByTitle('Start watching')).toBeInTheDocument()
    expect(screen.getByTitle('Vote for this issue')).toBeInTheDocument()
  })

  // WatchVoteButtons takes `task` as a prop (its parent, TaskDetailPage, owns the useTask query
  // and re-renders it with fresh data) - this isolated render doesn't have that parent, so a
  // successful mutation is verified by the request actually reaching the server, not by a
  // re-render this test harness can't naturally produce.
  it('calls the watch endpoint when "Start watching" is clicked', async () => {
    const task = makeTask({ id: 't-1' })
    let called = false
    server.use(
      http.post(url('/tasks/t-1/watch'), () => {
        called = true
        return HttpResponse.json({ success: true, data: { ...task, watcherIds: [CURRENT_USER] } })
      }),
    )
    const user = userEvent.setup()
    renderButtons(task)

    await user.click(screen.getByTitle('Start watching'))

    await waitFor(() => expect(called).toBe(true))
  })

  it('calls the vote endpoint when "Vote for this issue" is clicked', async () => {
    const task = makeTask({ id: 't-1' })
    let called = false
    server.use(
      http.post(url('/tasks/t-1/vote'), () => {
        called = true
        return HttpResponse.json({ success: true, data: { ...task, voterIds: [CURRENT_USER] } })
      }),
    )
    const user = userEvent.setup()
    renderButtons(task)

    await user.click(screen.getByTitle('Vote for this issue'))

    await waitFor(() => expect(called).toBe(true))
  })
})
