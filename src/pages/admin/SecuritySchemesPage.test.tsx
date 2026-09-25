import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { server } from '@/test/mocks/server'
import { SecuritySchemesPage } from './SecuritySchemesPage'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

const SCHEME = {
  id: 'scheme-1',
  organizationId: 'org-1',
  name: 'Confidentiality',
  levels: [
    {
      name: 'Confidential',
      allowedRoles: ['Manager'],
      allowedUserIds: [],
      allowedTeamIds: [],
      allowedProjectRoleIds: [],
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function mockSchemes(schemes: Array<Record<string, unknown>> = []) {
  server.use(
    http.get(url('/security-schemes'), () => HttpResponse.json({ success: true, data: schemes })),
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
  return render(<SecuritySchemesPage />, { wrapper: Wrapper })
}

describe('SecuritySchemesPage (Module 6 - Teams, Project Roles & Security Schemes)', () => {
  it('shows an empty state when there are no security schemes yet', async () => {
    mockSchemes([])
    renderPage()
    expect(await screen.findByText('No security schemes yet')).toBeInTheDocument()
  })

  it('shows a scheme card with its level names', async () => {
    mockSchemes([SCHEME])
    renderPage()
    expect(await screen.findByText('Confidentiality')).toBeInTheDocument()
    expect(screen.getByText('1 level: Confidential')).toBeInTheDocument()
  })

  it('deletes a scheme via the confirm dialog', async () => {
    let deleteCalled = false
    mockSchemes([SCHEME])
    server.use(
      http.delete(url('/security-schemes/scheme-1'), () => {
        deleteCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Confidentiality')
    await user.click(screen.getByRole('button', { name: 'Delete Confidentiality' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(deleteCalled).toBe(true))
  })
})
