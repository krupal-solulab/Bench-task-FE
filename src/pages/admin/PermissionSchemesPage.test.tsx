import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { server } from '@/test/mocks/server'
import { PermissionSchemesPage } from './PermissionSchemesPage'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

const SCHEME = {
  id: 'scheme-1',
  organizationId: 'org-1',
  name: 'Strict',
  grants: [
    { action: 'CreateIssue', allowedRoles: ['Developer'], allowedUserIds: [] },
    { action: 'Assign', allowedRoles: [], allowedUserIds: [] },
    { action: 'Transition', allowedRoles: [], allowedUserIds: [] },
    { action: 'Delete', allowedRoles: [], allowedUserIds: [] },
    { action: 'EditCustomFields', allowedRoles: [], allowedUserIds: [] },
    { action: 'ManageSprint', allowedRoles: [], allowedUserIds: [] },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function mockSchemes(schemes: Array<Record<string, unknown>> = []) {
  server.use(
    http.get(url('/permission-schemes'), () => HttpResponse.json({ success: true, data: schemes })),
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
  return render(<PermissionSchemesPage />, { wrapper: Wrapper })
}

describe('PermissionSchemesPage', () => {
  it('shows an empty state when there are no schemes yet (regression)', async () => {
    mockSchemes([])
    renderPage()
    expect(await screen.findByText('No permission schemes yet')).toBeInTheDocument()
  })

  it('shows a scheme card with its configured-action count', async () => {
    mockSchemes([SCHEME])
    renderPage()
    expect(await screen.findByText('Strict')).toBeInTheDocument()
    expect(screen.getByText('1 of 6 actions configured')).toBeInTheDocument()
  })

  it('deletes a scheme via the confirm dialog', async () => {
    let deleteCalled = false
    mockSchemes([SCHEME])
    server.use(
      http.delete(url('/permission-schemes/scheme-1'), () => {
        deleteCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Strict')
    await user.click(screen.getByRole('button', { name: 'Delete Strict' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(deleteCalled).toBe(true))
  })

  it('shows an error toast when deleting a scheme still in use', async () => {
    mockSchemes([SCHEME])
    server.use(
      http.delete(url('/permission-schemes/scheme-1'), () =>
        HttpResponse.json(
          {
            statusCode: 400,
            message: 'This scheme is assigned to one or more projects',
            error: 'Bad Request',
          },
          { status: 400 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Strict')
    await user.click(screen.getByRole('button', { name: 'Delete Strict' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Could not delete permission scheme')).toBeInTheDocument()
  })
})
