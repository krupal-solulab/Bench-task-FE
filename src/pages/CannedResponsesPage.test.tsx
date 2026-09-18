import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { server } from '@/test/mocks/server'
import { CannedResponsesPage } from './CannedResponsesPage'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

const RESPONSE = {
  id: 'cr-1',
  organizationId: 'org-1',
  createdBy: 'user-1',
  title: 'Investigating',
  body: "Thanks for reporting this - we're looking into it now.",
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function mockResponses(responses: Array<Record<string, unknown>> = []) {
  server.use(
    http.get(url('/canned-responses'), () => HttpResponse.json({ success: true, data: responses })),
  )
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          {children}
          <ToastViewport />
        </ToastProvider>
      </QueryClientProvider>
    )
  }
  return render(<CannedResponsesPage />, { wrapper: Wrapper })
}

describe('CannedResponsesPage', () => {
  it('shows an empty state when there are no canned responses yet', async () => {
    mockResponses([])
    renderPage()
    expect(await screen.findByText('No canned responses yet')).toBeInTheDocument()
  })

  it('shows an existing canned response', async () => {
    mockResponses([RESPONSE])
    renderPage()
    expect(await screen.findByText('Investigating')).toBeInTheDocument()
  })

  it('creates a new canned response', async () => {
    mockResponses([])
    let createdBody: Record<string, unknown> | null = null
    server.use(
      http.post(url('/canned-responses'), async ({ request }) => {
        createdBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          { success: true, data: { ...RESPONSE, ...createdBody } },
          { status: 201 },
        )
      }),
    )
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('No canned responses yet')
    await user.click(screen.getAllByRole('button', { name: 'New response' })[0]!)
    await user.type(screen.getByPlaceholderText('e.g. Investigating'), 'Resolved')
    await user.type(
      screen.getByPlaceholderText(/Thanks for reporting this/),
      'This has been resolved.',
    )
    await user.click(screen.getByRole('button', { name: 'Create response' }))

    await waitFor(() => expect(createdBody).toMatchObject({ title: 'Resolved' }))
  })

  it('deletes a canned response via the confirm dialog', async () => {
    let deleteCalled = false
    mockResponses([RESPONSE])
    server.use(
      http.delete(url('/canned-responses/cr-1'), () => {
        deleteCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Investigating')
    await user.click(screen.getByRole('button', { name: 'Delete Investigating' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(deleteCalled).toBe(true))
  })
})
