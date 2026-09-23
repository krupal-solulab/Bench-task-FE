import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { AuthContext, type AuthContextValue } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { mockUsers } from '@/test/mocks/fixtures'
import { TicketsListPage } from './TicketsListPage'

function makeAuthValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: mockUsers[0]!,
    isAuthenticated: true,
    isLoading: false,
    login: async () => {},
    registerOrganization: async () => {},
    logout: async () => {},
    hasRole: () => false,
    ...overrides,
  }
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function emptyMeta(total = 0) {
  return {
    total,
    page: 1,
    limit: 20,
    totalPages: total === 0 ? 0 : 1,
    hasNextPage: false,
    hasPrevPage: false,
  }
}

function renderPage(authValue: AuthContextValue = makeAuthValue()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ToastProvider>
            <AuthContext.Provider value={authValue}>
              {children}
              <ToastViewport />
            </AuthContext.Provider>
          </ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
  return render(<TicketsListPage />, { wrapper: Wrapper })
}

describe('TicketsListPage', () => {
  it('shows an empty state when there are no tickets', async () => {
    server.use(
      http.get(url('/tickets'), () =>
        HttpResponse.json({ success: true, data: [], meta: emptyMeta() }),
      ),
    )
    renderPage()

    expect(await screen.findByText('No tickets')).toBeInTheDocument()
  })

  it('renders a ticket row with its key, subject, and customer', async () => {
    server.use(
      http.get(url('/tickets'), () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: 't-1',
              ticketKey: 'SUP-1',
              subject: 'Cannot log in',
              customer: {
                id: 'c-1',
                name: 'Dana Customer',
                email: 'dana@customer.com',
                tier: 'Standard',
              },
              assignee: null,
              status: 'New',
              statusCategory: 'Open',
              priority: 'High',
            },
          ],
          meta: emptyMeta(1),
        }),
      ),
    )
    renderPage()

    expect(await screen.findByText(/Cannot log in/)).toBeInTheDocument()
    expect(screen.getByText('SUP-1', { exact: false })).toBeInTheDocument()
    expect(screen.getByText(/Dana Customer/)).toBeInTheDocument()
    expect(screen.getByText('Unassigned')).toBeInTheDocument()
  })

  it('opens the create-ticket modal and submits a new ticket', async () => {
    let sentBody: Record<string, unknown> | null = null
    server.use(
      http.get(url('/tickets'), () =>
        HttpResponse.json({ success: true, data: [], meta: emptyMeta() }),
      ),
      http.post(url('/tickets'), async ({ request }) => {
        sentBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          {
            success: true,
            data: {
              id: 't-2',
              ticketKey: 'SUP-2',
              subject: sentBody.subject,
              customer: {
                id: 'c-2',
                name: sentBody.customerName,
                email: sentBody.customerEmail,
                tier: 'Standard',
              },
              assignee: null,
              status: 'New',
              statusCategory: 'Open',
              priority: sentBody.priority,
            },
          },
          { status: 201 },
        )
      }),
    )
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /New ticket/ }))
    await user.type(screen.getByLabelText('Subject'), 'Cannot reset password')
    await user.type(screen.getByLabelText('Customer email'), 'dana@customer.com')
    await user.type(screen.getByLabelText('Customer name'), 'Dana Customer')
    await user.click(screen.getByRole('button', { name: 'Create ticket' }))

    await waitFor(() => expect(sentBody).not.toBeNull())
    expect(sentBody).toMatchObject({
      subject: 'Cannot reset password',
      customerEmail: 'dana@customer.com',
      customerName: 'Dana Customer',
      priority: 'Normal',
    })
    expect(await screen.findByText('Ticket SUP-2 created')).toBeInTheDocument()
  })
})
