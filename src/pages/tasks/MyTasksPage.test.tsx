import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { ToastProvider } from '@/context/ToastContext'
import { MyTasksPage } from '@/pages/tasks/MyTasksPage'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function mockMyTasks(onRequest?: (reqUrl: URL) => void) {
  server.use(
    http.get(url('/tasks/my-tasks'), ({ request }) => {
      onRequest?.(new URL(request.url))
      return HttpResponse.json({
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
      })
    }),
  )
}

function renderPage(initialEntry = '/tasks/my-tasks') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <ToastProvider>{children}</ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
  return render(<MyTasksPage />, { wrapper: Wrapper })
}

describe('MyTasksPage', () => {
  it('typing in the search filter sends it as a query param and resets to page 1 (regression: filters must not be discarded by the page-reset)', async () => {
    const seenSearches: Array<string | null> = []
    const seenPages: Array<string | null> = []
    mockMyTasks((reqUrl) => {
      seenSearches.push(reqUrl.searchParams.get('search'))
      seenPages.push(reqUrl.searchParams.get('page'))
    })
    const user = userEvent.setup()
    // Start on page 2 so resetting to page 1 on a filter change is actually observable.
    renderPage('/tasks/my-tasks?page=2')

    await waitFor(() => expect(screen.getByText('No tasks yet')).toBeInTheDocument())
    await user.type(screen.getByPlaceholderText('Search tasks…'), 'hero')

    await waitFor(() => expect(seenSearches.at(-1)).toBe('hero'))
    expect(seenPages.at(-1)).toBe('1')
  })
})
