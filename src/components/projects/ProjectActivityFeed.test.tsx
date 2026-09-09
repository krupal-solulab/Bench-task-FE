import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { mockUsers } from '@/test/mocks/fixtures'
import { ProjectActivityFeed } from '@/components/projects/ProjectActivityFeed'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`
const PROJECT_ID = 'p-1'

function renderFeed() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return render(<ProjectActivityFeed projectId={PROJECT_ID} />, { wrapper: Wrapper })
}

describe('ProjectActivityFeed', () => {
  it('does not fetch activity until expanded', async () => {
    let requested = false
    server.use(
      http.get(url(`/projects/${PROJECT_ID}/activity`), () => {
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

  it('fetches and renders activity entries once expanded', async () => {
    server.use(
      http.get(url(`/projects/${PROJECT_ID}/activity`), () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: 'a-1',
              action: 'status_changed',
              from: 'Planning',
              to: 'In Progress',
              actor: mockUsers[1],
              createdAt: '2026-01-05T00:00:00.000Z',
            },
          ],
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
    renderFeed()

    await user.click(screen.getByRole('button', { name: /Activity/ }))

    await waitFor(() =>
      expect(screen.getByText('changed status', { exact: false })).toBeInTheDocument(),
    )
    expect(screen.getByText(/Planning → In Progress/)).toBeInTheDocument()
    expect(screen.getByText('Mona Manager')).toBeInTheDocument()
  })

  it('shows an empty state when there is no activity yet', async () => {
    server.use(
      http.get(url(`/projects/${PROJECT_ID}/activity`), () =>
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

  it('shows an error state with a working retry on failure', async () => {
    let callCount = 0
    server.use(
      http.get(url(`/projects/${PROJECT_ID}/activity`), () => {
        callCount += 1
        if (callCount === 1) {
          return HttpResponse.json(
            { statusCode: 500, message: 'Server error', error: 'Error', timestamp: '', path: '' },
            { status: 500 },
          )
        }
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
    const user = userEvent.setup()
    renderFeed()

    await user.click(screen.getByRole('button', { name: /Activity/ }))
    expect(await screen.findByText('Server error')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Retry/ }))
    await waitFor(() => expect(screen.getByText('No activity yet.')).toBeInTheDocument())
  })
})
