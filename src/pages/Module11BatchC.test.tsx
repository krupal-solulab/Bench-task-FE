import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { server } from '@/test/mocks/server'
import { DigestCard } from '@/components/notifications/DigestCard'
import { DigestSettings } from '@/components/profile/DigestSettings'
import { ApiTokensSettings } from '@/components/profile/ApiTokensSettings'
import { ApiTokensPage } from '@/pages/admin/ApiTokensPage'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`
const ok = <T,>(data: T) => ({ success: true, data })

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ToastProvider>
            {children}
            <ToastViewport />
          </ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}

const token = {
  id: 'tok-1',
  name: 'CI pipeline',
  prefix: 'pat_ab12cd34',
  expiresAt: '2027-01-01T00:00:00.000Z',
  lastUsedAt: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  owner: 'u-1',
}

describe('Digest card (Module 11 gap-closure)', () => {
  it('summarises unread counts by type and switches period', async () => {
    const periods: string[] = []
    server.use(
      http.get(url('/notifications/digest'), ({ request }) => {
        const period = new URL(request.url).searchParams.get('period') ?? 'daily'
        periods.push(period)
        return HttpResponse.json(
          ok({
            period,
            unreadCount: period === 'weekly' ? 5 : 2,
            byType: [{ type: 'TaskAssigned', label: 'Assigned to you', count: 2 }],
            highlights: [],
            subject: '',
            text: '',
          }),
        )
      }),
    )
    const user = userEvent.setup()
    render(<DigestCard />, { wrapper: wrapper() })
    expect(await screen.findByText('2 unread notifications')).toBeInTheDocument()
    expect(screen.getByText('Assigned to you: 2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Last 7 days' }))
    expect(await screen.findByText('5 unread notifications')).toBeInTheDocument()
    expect(periods).toContain('weekly')
  })

  it('says when nothing is unread', async () => {
    render(<DigestCard />, { wrapper: wrapper() })
    expect(await screen.findByText('Nothing unread in this period.')).toBeInTheDocument()
  })
})

describe('Digest settings (Module 11 gap-closure)', () => {
  it('saves the chosen frequency alongside the existing muted types', async () => {
    let saved: unknown = null
    server.use(
      http.get(url('/notifications/preferences'), () =>
        HttpResponse.json(ok({ mutedTypes: ['CommentAdded'], digest: 'off' })),
      ),
      http.put(url('/notifications/preferences'), async ({ request }) => {
        saved = await request.json()
        return HttpResponse.json(ok(saved))
      }),
    )
    const user = userEvent.setup()
    render(<DigestSettings />, { wrapper: wrapper() })
    const select = await screen.findByLabelText(/Digest email/)
    await waitFor(() => expect(select).not.toBeDisabled())
    await user.selectOptions(select, 'weekly')
    await waitFor(() => expect(saved).toEqual({ mutedTypes: ['CommentAdded'], digest: 'weekly' }))
    expect(await screen.findByText('Weekly digest turned on')).toBeInTheDocument()
  })
})

describe('API tokens - profile section (Module 11 gap-closure)', () => {
  it('creates a token, shows the secret once, and lists it', async () => {
    let tokens: (typeof token)[] = []
    let body: unknown = null
    server.use(
      http.get(url('/api-tokens'), () => HttpResponse.json(ok(tokens))),
      http.post(url('/api-tokens'), async ({ request }) => {
        body = await request.json()
        tokens = [token]
        return HttpResponse.json(ok({ token: 'pat_ab12cd34secret', apiToken: token }), {
          status: 201,
        })
      }),
    )
    const user = userEvent.setup()
    render(<ApiTokensSettings />, { wrapper: wrapper() })
    expect(await screen.findByText('You have no API tokens.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Token name'), 'CI pipeline')
    await user.selectOptions(screen.getByLabelText('Expires'), 'never')
    await user.click(screen.getByRole('button', { name: 'Create token' }))

    await waitFor(() => expect(body).toEqual({ name: 'CI pipeline', expiresInDays: null }))
    expect(await screen.findByLabelText('New API token')).toHaveValue('pat_ab12cd34secret')
    expect(screen.getByText(/won't be able to see it again/)).toBeInTheDocument()
    expect(await screen.findByText('CI pipeline')).toBeInTheDocument()
    expect(screen.getByText(/never used/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.queryByLabelText('New API token')).not.toBeInTheDocument()
  })

  it('revokes a token after confirming', async () => {
    let revoked = false
    server.use(
      http.get(url('/api-tokens'), () => HttpResponse.json(ok(revoked ? [] : [token]))),
      http.delete(url('/api-tokens/tok-1'), () => {
        revoked = true
        return HttpResponse.json(ok(token))
      }),
    )
    const user = userEvent.setup()
    render(<ApiTokensSettings />, { wrapper: wrapper() })
    await user.click(await screen.findByRole('button', { name: 'Revoke CI pipeline' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Revoke' }))
    await waitFor(() => expect(revoked).toBe(true))
    expect(await screen.findByText('You have no API tokens.')).toBeInTheDocument()
  })
})

describe('API tokens - admin page (Module 11 gap-closure)', () => {
  it("lists the org's tokens with owners and revokes through the admin route", async () => {
    let revoked = false
    server.use(
      http.get(url('/api-tokens/org'), () =>
        HttpResponse.json(
          ok(
            revoked
              ? []
              : [{ ...token, owner: { id: 'u-1', name: 'Dana Dev', email: 'dana@example.com' } }],
          ),
        ),
      ),
      http.delete(url('/api-tokens/org/tok-1'), () => {
        revoked = true
        return HttpResponse.json(ok(token))
      }),
    )
    const user = userEvent.setup()
    render(<ApiTokensPage />, { wrapper: wrapper() })
    expect(await screen.findByText('Dana Dev (dana@example.com)')).toBeInTheDocument()
    expect(screen.getByText('pat_ab12cd34…')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Revoke CI pipeline' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Revoke' }))
    await waitFor(() => expect(revoked).toBe(true))
    expect(await screen.findByText('No active API tokens')).toBeInTheDocument()
  })
})
