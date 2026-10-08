import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { AcceptInvitePage } from '@/pages/auth/AcceptInvitePage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { SetPasswordPage } from '@/pages/auth/SetPasswordPage'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { mockUsers } from '@/test/mocks/fixtures'
import { server } from '@/test/mocks/server'
import { renderWithProviders, screen, waitFor } from '@/test/utils/render'
import type { ProjectInvitePreview } from '@/types/project-invite.types'
import type { User } from '@/types/user.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`
const TOKEN = 'tok_abcdefghijklmnopqrstuvwxyz0123456789ABCDE'

const invitee: User = {
  id: 'u-invitee',
  name: 'Asha Patel',
  email: 'asha@example.com',
  role: 'Developer',
  isActive: true,
  organizationId: 'org-1',
  mustChangePassword: true,
  createdAt: '',
  updatedAt: '',
}

function preview(overrides: Partial<ProjectInvitePreview> = {}): ProjectInvitePreview {
  return {
    status: 'Pending',
    email: 'asha@example.com',
    role: 'Developer',
    projectName: 'Apollo',
    organizationName: 'Acme',
    inviterName: 'Max Manager',
    expiresAt: new Date(Date.now() + 6 * 86_400_000).toISOString(),
    ...overrides,
  }
}

function renderApp(path: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/invite/:token" element={<AcceptInvitePage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/set-password" element={<SetPasswordPage />} />
        <Route path="/projects" element={<p>Projects page</p>} />
        <Route path="/dashboard" element={<p>Dashboard page</p>} />
      </Route>
    </Routes>,
    { initialEntries: [path] },
  )
}

describe('invite flow pages', () => {
  afterEach(() => localStorage.clear())

  it('accepts a pending invite with the temporary password, then forces a new password', async () => {
    let acceptBody: unknown
    let completeBody: unknown
    server.use(
      http.get(url(`/auth/invites/${TOKEN}`), () =>
        HttpResponse.json({ success: true, data: preview() }),
      ),
      http.post(url(`/auth/invites/${TOKEN}/accept`), async ({ request }) => {
        acceptBody = await request.json()
        return HttpResponse.json({
          success: true,
          data: { accessToken: 'a', refreshToken: 'r', user: invitee },
        })
      }),
      http.post(url('/auth/me/initial-password'), async ({ request }) => {
        completeBody = await request.json()
        return HttpResponse.json({
          success: true,
          data: {
            accessToken: 'a2',
            refreshToken: 'r2',
            user: { ...invitee, name: 'Asha Patel', mustChangePassword: false },
          },
        })
      }),
    )
    const user = userEvent.setup()
    renderApp(`/invite/${TOKEN}`)

    expect(await screen.findByText('Join Apollo')).toBeInTheDocument()
    expect(screen.getByText(/Max Manager invited you to Acme as a Developer/)).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveValue('asha@example.com')
    await user.type(screen.getByLabelText(/temporary password/i), 'Tmp4wordXyz9')
    await user.click(screen.getByRole('button', { name: 'Accept invitation' }))

    expect(await screen.findByText('Complete your account')).toBeInTheDocument()
    expect(acceptBody).toEqual({ temporaryPassword: 'Tmp4wordXyz9' })

    await user.type(screen.getByLabelText(/full name/i), 'Asha Patel')
    await user.type(screen.getByLabelText(/^new password/i), 'MyOwnPass123')
    await user.type(screen.getByLabelText(/confirm new password/i), 'MyOwnPass123')
    await user.click(screen.getByRole('button', { name: 'Complete account' }))

    expect(await screen.findByText('Projects page')).toBeInTheDocument()
    expect(completeBody).toEqual({ name: 'Asha Patel', newPassword: 'MyOwnPass123' })
  })

  it('shows the accept error (e.g. a wrong temporary password) inline', async () => {
    server.use(
      http.get(url(`/auth/invites/${TOKEN}`), () =>
        HttpResponse.json({ success: true, data: preview() }),
      ),
      http.post(url(`/auth/invites/${TOKEN}/accept`), () =>
        HttpResponse.json(
          { statusCode: 401, message: 'Incorrect temporary password', error: 'Unauthorized' },
          { status: 401 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderApp(`/invite/${TOKEN}`)

    await user.type(await screen.findByLabelText(/temporary password/i), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Accept invitation' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect temporary password')
  })

  it('switches to the revoked page when the owner revokes while the form is open', async () => {
    let revoked = false
    server.use(
      http.get(url(`/auth/invites/${TOKEN}`), () =>
        HttpResponse.json({
          success: true,
          data: preview(revoked ? { status: 'Revoked' } : {}),
        }),
      ),
      http.post(url(`/auth/invites/${TOKEN}/accept`), () => {
        revoked = true
        return HttpResponse.json(
          {
            statusCode: 410,
            message: 'This invitation has been revoked. Ask the project owner for a new one.',
            error: 'Gone',
          },
          { status: 410 },
        )
      }),
    )
    const user = userEvent.setup()
    renderApp(`/invite/${TOKEN}`)

    await user.type(await screen.findByLabelText(/temporary password/i), 'Tmp4wordXyz9')
    await user.click(screen.getByRole('button', { name: 'Accept invitation' }))

    expect(await screen.findByText('Invitation revoked')).toBeInTheDocument()
    expect(screen.getByText(/Ask Max Manager for a new one/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/temporary password/i)).not.toBeInTheDocument()
  })

  it.each([
    ['Expired', 'Invitation expired', /Ask Max Manager to resend it/],
    ['Revoked', 'Invitation revoked', /Ask Max Manager for a new one/],
    ['Accepted', 'Invitation already accepted', /password you chose/],
  ] as const)(
    'explains a %s invitation instead of showing the form',
    async (status, title, text) => {
      server.use(
        http.get(url(`/auth/invites/${TOKEN}`), () =>
          HttpResponse.json({ success: true, data: preview({ status }) }),
        ),
      )
      renderApp(`/invite/${TOKEN}`)

      expect(await screen.findByText(title)).toBeInTheDocument()
      expect(screen.getByText(text)).toBeInTheDocument()
      expect(screen.queryByLabelText(/temporary password/i)).not.toBeInTheDocument()
    },
  )

  it('reports an unknown or superseded link', async () => {
    server.use(
      http.get(url(`/auth/invites/${TOKEN}`), () =>
        HttpResponse.json(
          { statusCode: 404, message: 'Invitation not found', error: 'Not Found' },
          { status: 404 },
        ),
      ),
    )
    renderApp(`/invite/${TOKEN}`)

    expect(await screen.findByText('Invitation not found')).toBeInTheDocument()
    expect(screen.getByText(/use the newest email/)).toBeInTheDocument()
  })

  it('keeps an account with a pending password change on the set-password page', async () => {
    localStorage.setItem('ptm.refreshToken', 'mock-refresh-token')
    server.use(http.get(url('/auth/me'), () => HttpResponse.json({ success: true, data: invitee })))
    renderApp('/projects')

    expect(await screen.findByText('Complete your account')).toBeInTheDocument()
    expect(screen.queryByText('Projects page')).not.toBeInTheDocument()
  })

  it('lets a normal account through, and sends it away from the set-password page', async () => {
    localStorage.setItem('ptm.refreshToken', 'mock-refresh-token')
    server.use(
      http.get(url('/auth/me'), () => HttpResponse.json({ success: true, data: mockUsers[2] })),
    )
    renderApp('/set-password')

    expect(await screen.findByText('Dashboard page')).toBeInTheDocument()
  })

  it('the login form shows an expired invitation message instead of the generic error', async () => {
    server.use(
      http.post(url('/auth/login'), () =>
        HttpResponse.json(
          {
            statusCode: 401,
            message: 'This invitation has expired. Ask the project owner to resend it.',
            error: 'Unauthorized',
          },
          { status: 401 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderApp('/login')

    await user.type(screen.getByLabelText(/email/i), 'late@example.com')
    await user.type(screen.getByLabelText(/password/i), 'Tmp4wordXyz9')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/invitation has expired/),
    )
  })
})
