import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { TicketDetailPage } from './TicketDetailPage'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function mockTicket() {
  return {
    id: 't-1',
    ticketKey: 'SUP-1',
    subject: 'Cannot log in',
    description: 'I keep getting an invalid password error.',
    customer: { id: 'c-1', name: 'Dana Customer', email: 'dana@customer.com', tier: 'Standard' },
    assignee: null,
    status: 'New',
    statusCategory: 'Open',
    priority: 'High',
    channel: 'manual',
    tags: [],
    firstRespondedAt: null,
    solvedAt: null,
    pausedAccumMs: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function mockRoutes() {
  server.use(
    http.get(url('/tickets/t-1'), () => HttpResponse.json({ success: true, data: mockTicket() })),
    http.get(url('/tickets/t-1/comments'), () => HttpResponse.json({ success: true, data: [] })),
    http.get(url('/tickets/t-1/activity'), () => HttpResponse.json({ success: true, data: [] })),
    http.get(url('/users/assignable'), () =>
      HttpResponse.json({
        success: true,
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 100,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      }),
    ),
  )
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/tickets/t-1']}>
          <ToastProvider>
            {children}
            <ToastViewport />
          </ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
  return render(
    <Routes>
      <Route path="/tickets/:id" element={<TicketDetailPage />} />
    </Routes>,
    { wrapper: Wrapper },
  )
}

describe('TicketDetailPage', () => {
  it('renders the ticket header, description, and status control', async () => {
    mockRoutes()
    renderPage()

    expect(await screen.findByText(/SUP-1/)).toBeInTheDocument()
    expect(screen.getByText(/Cannot log in/)).toBeInTheDocument()
    expect(screen.getByText(/invalid password error/)).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('New')
  })

  it('shows an empty state when there are no replies yet', async () => {
    mockRoutes()
    renderPage()

    expect(await screen.findByText('No replies yet')).toBeInTheDocument()
  })

  it('adds a public reply and clears the comment box', async () => {
    mockRoutes()
    let sentBody: Record<string, unknown> | null = null
    server.use(
      http.post(url('/tickets/t-1/comments'), async ({ request }) => {
        sentBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          { success: true, data: { id: 'com-1', ...sentBody } },
          { status: 201 },
        )
      }),
    )
    const user = userEvent.setup()
    renderPage()

    await screen.findByText(/SUP-1/)
    const textarea = screen.getByPlaceholderText('Write a reply or internal note…')
    await user.type(textarea, 'We are looking into it!')
    await user.click(screen.getByRole('button', { name: 'Send reply' }))

    await waitFor(() => expect(sentBody).not.toBeNull())
    expect(sentBody).toMatchObject({ body: 'We are looking into it!', isPublic: true })
    await waitFor(() => expect(textarea).toHaveValue(''))
  })

  it('unchecking "Public reply" sends isPublic: false and labels the button "Add note"', async () => {
    mockRoutes()
    const user = userEvent.setup()
    renderPage()

    await screen.findByText(/SUP-1/)
    await user.click(screen.getByLabelText('Public reply'))

    expect(screen.getByRole('button', { name: 'Add note' })).toBeInTheDocument()
  })

  it("shows the Priority selector with the ticket's current value", async () => {
    mockRoutes()
    renderPage()

    expect(await screen.findByRole('combobox', { name: 'Priority' })).toHaveTextContent('High')
  })

  it('shows an "Apply macro" selector when macros exist, and hides it when there are none', async () => {
    mockRoutes()
    server.use(
      http.get(url('/tickets/settings/macros'), () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: 'm-1',
              name: 'Close as resolved',
              actions: [{ type: 'SetStatus', value: 'Solved' }],
              visibility: 'team',
              createdBy: 'u-1',
            },
          ],
        }),
      ),
    )
    renderPage()

    expect(await screen.findByRole('combobox', { name: 'Apply macro' })).toBeInTheDocument()
  })

  it('does not show an "Apply macro" selector when no macros are configured', async () => {
    mockRoutes()
    renderPage()

    await screen.findByText(/SUP-1/)
    expect(screen.queryByRole('combobox', { name: 'Apply macro' })).not.toBeInTheDocument()
  })
})
