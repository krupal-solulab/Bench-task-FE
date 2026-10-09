import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { server } from '@/test/mocks/server'
import { UsersPage } from '@/pages/admin/UsersPage'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function mockUsersList(onRequest?: (reqUrl: URL) => void) {
  server.use(
    http.get(url('/users'), ({ request }) => {
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

function renderPage(initialEntry = '/admin/users') {
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
  return render(<UsersPage />, { wrapper: Wrapper })
}

describe('UsersPage', () => {
  it('typing in the search filter sends it as a query param and resets to page 1 (regression: filters must not be discarded by the page-reset)', async () => {
    const seenSearches: Array<string | null> = []
    const seenPages: Array<string | null> = []
    mockUsersList((reqUrl) => {
      seenSearches.push(reqUrl.searchParams.get('search'))
      seenPages.push(reqUrl.searchParams.get('page'))
    })
    const user = userEvent.setup()
    // Start on page 2 so resetting to page 1 on a filter change is actually observable.
    renderPage('/admin/users?page=2')

    await waitFor(() => expect(screen.getByText('No users yet')).toBeInTheDocument())
    await user.type(screen.getByPlaceholderText('Search by name or email…'), 'dana')

    await waitFor(() => expect(seenSearches.at(-1)).toBe('dana'))
    expect(seenPages.at(-1)).toBe('1')
  })

  // Both ways to add someone stay: create the account directly, or invite by email.
  it('keeps New User (Admin sets the password) next to Invite user', async () => {
    mockUsersList()
    let created: unknown = null
    server.use(
      http.post(url('/users'), async ({ request }) => {
        created = await request.json()
        return HttpResponse.json({ success: true, data: { id: 'u-new' } }, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByRole('button', { name: /Invite user/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /New User/ }))
    await user.type(await screen.findByLabelText(/^Name/), 'Neha Shah')
    await user.type(screen.getByLabelText(/^Email/), 'neha.direct@example.com')
    await user.type(screen.getByLabelText(/^Password/), 'Password123')
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    await waitFor(() =>
      expect(created).toEqual({
        name: 'Neha Shah',
        email: 'neha.direct@example.com',
        password: 'Password123',
        role: 'Developer',
        customRoleId: null,
      }),
    )
  })

  // Admin > Users can also invite by email + role (the person sets their own name and password).
  describe('Invite user', () => {
    const pendingInvite = {
      id: 'inv-1',
      projectId: null,
      email: 'pending@example.com',
      name: null,
      role: 'Developer',
      customRoleId: null,
      status: 'Pending',
      expiresAt: '2099-01-01T00:00:00.000Z',
      invitedBy: { id: 'u-1', name: 'Ada' },
      resendCount: 0,
      lastSentAt: null,
      acceptedAt: null,
      revokedAt: null,
      createdAt: '2026-10-08T00:00:00.000Z',
    }

    it('asks only for email and role - no name or password - and shows the one-time secrets', async () => {
      mockUsersList()
      let sent: unknown = null
      server.use(
        http.post(url('/organization-invites'), async ({ request }) => {
          sent = await request.json()
          return HttpResponse.json(
            {
              success: true,
              data: {
                invite: { ...pendingInvite, email: 'neha@example.com' },
                inviteUrl: 'http://localhost:5173/invite/abc',
                temporaryPassword: 'Temp1234abcd',
                emailSent: false,
              },
            },
            { status: 201 },
          )
        }),
      )
      const user = userEvent.setup()
      renderPage()
      await user.click(await screen.findByRole('button', { name: /Invite user/ }))

      const dialog = await screen.findByRole('dialog')
      expect(screen.getByLabelText(/Email/)).toBeInTheDocument()
      expect(screen.queryByLabelText(/^Name/)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/Password/)).not.toBeInTheDocument()
      expect(dialog).toHaveTextContent('Developer')

      await user.type(screen.getByLabelText(/Email/), 'neha@example.com')
      await user.click(screen.getByRole('button', { name: 'Send invitation' }))

      await waitFor(() =>
        expect(sent).toEqual({ email: 'neha@example.com', role: 'Developer', customRoleId: null }),
      )
      expect(await screen.findByText('Invitation sent')).toBeInTheDocument()
      // Shown once, right after sending: the link and the (masked until revealed) password.
      expect(screen.getByDisplayValue('http://localhost:5173/invite/abc')).toBeInTheDocument()
      const password = screen.getByDisplayValue('Temp1234abcd')
      expect(password).toHaveAttribute('type', 'password')
    })

    it('lists pending invitations with Resend and Revoke', async () => {
      mockUsersList()
      server.use(
        http.get(url('/organization-invites'), () =>
          HttpResponse.json({ success: true, data: [pendingInvite] }),
        ),
      )
      renderPage()
      expect(await screen.findByText('pending@example.com')).toBeInTheDocument()
      expect(screen.getByText('Pending invitations (1)')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Resend invitation to pending@example.com' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Revoke invitation to pending@example.com' }),
      ).toBeInTheDocument()
    })
  })
})
