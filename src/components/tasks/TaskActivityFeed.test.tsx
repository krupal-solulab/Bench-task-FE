import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { mockUsers } from '@/test/mocks/fixtures'
import { TaskActivityFeed } from '@/components/tasks/TaskActivityFeed'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`
const TASK_ID = 't-1'

function renderFeed() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return render(<TaskActivityFeed taskId={TASK_ID} />, { wrapper: Wrapper })
}

describe('TaskActivityFeed', () => {
  it('does not fetch activity until expanded', async () => {
    let requested = false
    server.use(
      http.get(url(`/tasks/${TASK_ID}/activity`), () => {
        requested = true
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
    renderFeed()
    await new Promise((r) => setTimeout(r, 50))
    expect(requested).toBe(false)
  })

  it('fetches and renders activity entries with a from/to detail once expanded', async () => {
    server.use(
      http.get(url(`/tasks/${TASK_ID}/activity`), () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: 'a-1',
              action: 'status_changed',
              from: 'Todo',
              to: 'In Progress',
              actor: mockUsers[2],
              createdAt: '2026-01-05T00:00:00.000Z',
            },
            {
              id: 'a-2',
              action: 'created',
              from: null,
              to: null,
              actor: mockUsers[1],
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          meta: {
            total: 2,
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
    renderFeed()

    await user.click(screen.getByRole('button', { name: /Activity/ }))

    await waitFor(() => expect(screen.getByText(/Todo → In Progress/)).toBeInTheDocument())
    expect(screen.getByText('created the task', { exact: false })).toBeInTheDocument()
  })

  it('shows an empty state when there is no activity yet', async () => {
    server.use(
      http.get(url(`/tasks/${TASK_ID}/activity`), () =>
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
    const user = userEvent.setup()
    renderFeed()

    await user.click(screen.getByRole('button', { name: /Activity/ }))
    expect(await screen.findByText('No activity yet.')).toBeInTheDocument()
  })
})
