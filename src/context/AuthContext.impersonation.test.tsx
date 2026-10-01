import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { useContext } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '@/context/AuthContext'
import { ImpersonationBanner } from '@/components/layout/ImpersonationBanner'
import { server } from '@/test/mocks/server'
import { mockUsers } from '@/test/mocks/fixtures'
import { renderWithProviders } from '@/test/utils/render'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`
const DEV = mockUsers[2]!
const ADMIN = mockUsers[0]!

function Probe() {
  const auth = useContext(AuthContext)
  if (auth?.isLoading) return <p>loading</p>
  return (
    <div>
      <p data-testid="user">{auth?.user?.name ?? 'nobody'}</p>
      <p data-testid="impersonating">{auth?.impersonation ? 'yes' : 'no'}</p>
      <button type="button" onClick={() => void auth?.logout()}>
        Log out
      </button>
    </div>
  )
}

/** Module 8 gap-closure: read-only "view as" on the client. */
describe('AuthProvider impersonation', () => {
  const assign = vi.fn()
  const originalLocation = window.location

  beforeEach(() => {
    assign.mockReset()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, assign },
    })
  })

  afterEach(() => {
    sessionStorage.clear()
    localStorage.clear()
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })

  function storeViewAs(expiresInMs = 10 * 60 * 1000) {
    sessionStorage.setItem(
      'ptm.impersonation',
      JSON.stringify({
        accessToken: 'view-as-token',
        expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
        impersonator: { id: ADMIN.id, name: ADMIN.name, email: ADMIN.email },
      }),
    )
  }

  it('restores a stored "view as" session on load, using its token for /auth/me', async () => {
    storeViewAs()
    let sentAuth: string | null = null
    server.use(
      http.get(url('/auth/me'), ({ request }) => {
        sentAuth = request.headers.get('authorization')
        return HttpResponse.json({ success: true, data: DEV })
      }),
    )
    renderWithProviders(
      <>
        <ImpersonationBanner />
        <Probe />
      </>,
    )

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(DEV.name))
    expect(sentAuth).toBe('Bearer view-as-token')
    expect(screen.getByTestId('impersonating')).toHaveTextContent('yes')
    expect(screen.getByRole('status')).toHaveTextContent(`Viewing as ${DEV.name}`)
    expect(screen.getByRole('status')).toHaveTextContent(`Signed in as ${ADMIN.name}`)
  })

  it('ignores an expired stored session (and clears it)', async () => {
    storeViewAs(-1000)
    renderWithProviders(<Probe />)
    await waitFor(() => expect(screen.getByTestId('impersonating')).toHaveTextContent('no'))
    expect(sessionStorage.getItem('ptm.impersonation')).toBeNull()
  })

  it('"Log out" while viewing as ends the session instead of revoking the user\'s sessions', async () => {
    storeViewAs()
    server.use(http.get(url('/auth/me'), () => HttpResponse.json({ success: true, data: DEV })))
    const logout = vi.fn()
    const ended = vi.fn()
    server.use(
      http.post(url('/auth/logout'), () => {
        logout()
        return HttpResponse.json({ success: true, data: null })
      }),
      http.post(url('/auth/impersonation/end'), () => {
        ended()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(<Probe />)

    await waitFor(() => expect(screen.getByTestId('impersonating')).toHaveTextContent('yes'))
    await user.click(screen.getByRole('button', { name: 'Log out' }))

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/admin/users'))
    expect(ended).toHaveBeenCalled()
    expect(logout).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('ptm.impersonation')).toBeNull()
  })
})
