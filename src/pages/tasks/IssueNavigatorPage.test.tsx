import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { mockTasks } from '@/test/mocks/fixtures'
import { IssueNavigatorPage } from '@/pages/tasks/IssueNavigatorPage'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }
  return render(<IssueNavigatorPage />, { wrapper: Wrapper })
}

describe('IssueNavigatorPage', () => {
  it('shows a prompt to search before any query has been run', () => {
    renderPage()
    expect(screen.getByText('Run a query to get started')).toBeInTheDocument()
  })

  it('runs a JQL search and lists the matching issues', async () => {
    server.use(
      http.get(url('/tasks/search'), () =>
        HttpResponse.json({
          success: true,
          data: [mockTasks[0]],
          meta: {
            total: 1,
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
    renderPage()

    await user.type(screen.getByLabelText('Advanced search'), 'status != Done')
    await user.click(screen.getByRole('button', { name: /Search/ }))

    expect(await screen.findByText(mockTasks[0]!.title)).toBeInTheDocument()
    expect(screen.queryByText('Run a query to get started')).not.toBeInTheDocument()
  })
})
