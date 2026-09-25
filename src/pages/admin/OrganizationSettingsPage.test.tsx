import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { server } from '@/test/mocks/server'
import { OrganizationSettingsPage } from './OrganizationSettingsPage'
import type { OrganizationSettings } from '@/types/organization.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

const SETTINGS: OrganizationSettings = {
  id: 'org-1',
  name: 'Acme Inc',
  timezone: 'UTC',
  logoUrl: null,
}

function mockSettings(settings: OrganizationSettings = SETTINGS) {
  server.use(
    http.get(url('/organizations/me'), () => HttpResponse.json({ success: true, data: settings })),
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
  return render(<OrganizationSettingsPage />, { wrapper: Wrapper })
}

describe('OrganizationSettingsPage', () => {
  it('prefills the form with the current organization settings', async () => {
    mockSettings()
    renderPage()

    expect(await screen.findByDisplayValue('Acme Inc')).toBeInTheDocument()
    expect(screen.getByDisplayValue('UTC')).toBeInTheDocument()
  })

  it('saves updated settings and shows a success toast', async () => {
    mockSettings()
    let capturedBody: Record<string, unknown> | null = null
    server.use(
      http.patch(url('/organizations/me'), async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ success: true, data: { ...SETTINGS, ...capturedBody } })
      }),
    )
    const user = userEvent.setup()
    renderPage()

    const nameInput = await screen.findByDisplayValue('Acme Inc')
    await user.clear(nameInput)
    await user.type(nameInput, 'Renamed Inc')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(screen.getByText('Organization settings saved')).toBeInTheDocument())
    expect(capturedBody).toMatchObject({ name: 'Renamed Inc', timezone: 'UTC', logoUrl: null })
  })

  it('the save button is disabled until the form is edited', async () => {
    mockSettings()
    renderPage()

    await screen.findByDisplayValue('Acme Inc')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })

  it('shows a destructive toast when saving fails', async () => {
    mockSettings()
    server.use(
      http.patch(url('/organizations/me'), () =>
        HttpResponse.json(
          { statusCode: 400, message: 'Name is too long', error: 'Error', timestamp: '', path: '' },
          { status: 400 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderPage()

    const nameInput = await screen.findByDisplayValue('Acme Inc')
    await user.type(nameInput, ' II')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Could not save organization settings')).toBeInTheDocument()
    expect(screen.getByText('Name is too long')).toBeInTheDocument()
  })

  it('rejects an invalid logo URL client-side without submitting', async () => {
    mockSettings()
    let patchCalled = false
    server.use(
      http.patch(url('/organizations/me'), () => {
        patchCalled = true
        return HttpResponse.json({ success: true, data: SETTINGS })
      }),
    )
    const user = userEvent.setup()
    renderPage()

    const nameInput = await screen.findByDisplayValue('Acme Inc')
    await user.type(nameInput, ' II')
    const logoInput = screen.getByLabelText('Logo URL')
    await user.type(logoInput, 'not-a-url')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Enter a valid URL')).toBeInTheDocument()
    expect(patchCalled).toBe(false)
  })
})
