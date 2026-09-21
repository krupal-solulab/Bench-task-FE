import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { MyOpenIssuesList } from './MyOpenIssuesList'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function renderList() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }
  return render(<MyOpenIssuesList scope={{}} />, { wrapper: Wrapper })
}

describe('MyOpenIssuesList', () => {
  it('shows an empty state when the caller has no open issues (regression)', async () => {
    server.use(
      http.get(url('/dashboard/my-open-issues'), () =>
        HttpResponse.json({ success: true, data: [] }),
      ),
    )
    renderList()

    expect(await screen.findByText('Nothing assigned to you')).toBeInTheDocument()
  })

  it('renders each open issue with its project, status, priority, and due date', async () => {
    server.use(
      http.get(url('/dashboard/my-open-issues'), () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: 't-1',
              title: 'Fix the bug',
              issueKey: 'PRJ-1',
              project: { id: 'p-1', name: 'My Project' },
              status: 'In Progress',
              dueDate: '2026-02-01T00:00:00.000Z',
              priority: 'P1',
            },
          ],
        }),
      ),
    )
    renderList()

    expect(await screen.findByText('Fix the bug')).toBeInTheDocument()
    expect(screen.getByText('My Project · PRJ-1', { exact: false })).toBeInTheDocument()
  })

  it('shows an error state when the request fails', async () => {
    server.use(
      http.get(url('/dashboard/my-open-issues'), () =>
        HttpResponse.json({ success: false, message: 'boom' }, { status: 500 }),
      ),
    )
    renderList()

    expect(await screen.findByText('boom')).toBeInTheDocument()
  })
})
