import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { mockUsers } from '@/test/mocks/fixtures'
import { TicketSettingsPage } from './TicketSettingsPage'

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

function renderPage(authValue: AuthContextValue = makeAuthValue()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthContext.Provider value={authValue}>
            {children}
            <ToastViewport />
          </AuthContext.Provider>
        </ToastProvider>
      </QueryClientProvider>
    )
  }
  return render(<TicketSettingsPage />, { wrapper: Wrapper })
}

describe('TicketSettingsPage', () => {
  it('renders every settings tab', async () => {
    renderPage(makeAuthValue({ hasRole: (role) => role === 'Admin' }))

    expect(await screen.findByText('Ticket automation settings')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Triggers' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Automations' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Macros' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'SLA Policy' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Business Hours' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Automation Log' })).toBeInTheDocument()
  })

  it('shows editing controls on the default tab for an Admin', async () => {
    renderPage(makeAuthValue({ hasRole: (role) => role === 'Admin' }))

    expect(await screen.findByRole('button', { name: 'Save trigger rules' })).toBeInTheDocument()
  })

  it('hides editing controls for a Developer (view-only)', async () => {
    renderPage(makeAuthValue({ hasRole: () => false }))

    await screen.findByText('Ticket automation settings')
    expect(screen.queryByRole('button', { name: 'Save trigger rules' })).not.toBeInTheDocument()
  })

  it('switches tabs to show the SLA policy form', async () => {
    const user = userEvent.setup()
    renderPage(makeAuthValue({ hasRole: (role) => role === 'Admin' }))

    await user.click(await screen.findByRole('tab', { name: 'SLA Policy' }))

    expect(await screen.findByRole('button', { name: 'Save SLA policy' })).toBeInTheDocument()
  })
})
