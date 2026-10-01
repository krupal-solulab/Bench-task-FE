import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { useState, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { AuthContext, type AuthContextValue } from '@/context/AuthContext'
import { ToastViewport } from '@/components/common/Toast'
import { server } from '@/test/mocks/server'
import { mockUsers } from '@/test/mocks/fixtures'
import { UserBulkActionBar } from './UserBulkActionBar'
import { UserTable } from './UserTable'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          {children}
          <ToastViewport />
        </ToastProvider>
      </QueryClientProvider>
    )
  }
}

describe('UserBulkActionBar (Module 8 gap-closure)', () => {
  it('deactivates the selected users after confirmation and reports success', async () => {
    let sentBody: unknown = null
    server.use(
      http.post(url('/users/bulk/status'), async ({ request }) => {
        sentBody = await request.json()
        return HttpResponse.json({ success: true, data: { succeeded: ['u-2', 'u-3'], failed: [] } })
      }),
    )
    const onDone = vi.fn()
    const user = userEvent.setup()
    render(<UserBulkActionBar selectedIds={new Set(['u-2', 'u-3'])} onDone={onDone} />, {
      wrapper: wrapper(),
    })

    expect(screen.getByText('2 selected')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Deactivate' }))
    expect(screen.getAllByText(/Deactivate 2 user\(s\)\?/).length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    await waitFor(() => expect(sentBody).toEqual({ userIds: ['u-2', 'u-3'], isActive: false }))
    expect(await screen.findByText('Deactivate: 2 user(s) updated')).toBeInTheDocument()
    expect(onDone).toHaveBeenCalled()
  })

  it('shows a partial-failure toast with the first failure reason', async () => {
    server.use(
      http.post(url('/users/bulk/status'), () =>
        HttpResponse.json({
          success: true,
          data: {
            succeeded: ['u-2'],
            failed: [{ userId: 'u-1', message: 'Admins cannot deactivate themselves' }],
          },
        }),
      ),
    )
    const user = userEvent.setup()
    render(<UserBulkActionBar selectedIds={new Set(['u-1', 'u-2'])} onDone={vi.fn()} />, {
      wrapper: wrapper(),
    })

    await user.click(screen.getByRole('button', { name: 'Activate' }))
    await user.click(screen.getByRole('button', { name: 'Apply' }))
    expect(await screen.findByText('Activate: 1 succeeded, 1 failed')).toBeInTheDocument()
    expect(screen.getByText('Admins cannot deactivate themselves')).toBeInTheDocument()
  })
})

describe('UserTable selection (Module 8 gap-closure)', () => {
  function SelectableTable() {
    const [selected, setSelected] = useState<Set<string>>(new Set())
    return (
      <>
        <p data-testid="selected">{[...selected].sort().join(',')}</p>
        <UserTable
          users={[mockUsers[2]!, mockUsers[3]!]}
          isLoading={false}
          isError={false}
          onRetry={vi.fn()}
          selectedIds={selected}
          onSelectionChange={setSelected}
          currentUserId={mockUsers[3]!.id}
        />
      </>
    )
  }

  it("select-all picks every row except the acting Admin's own, whose checkbox is disabled", async () => {
    const authValue: AuthContextValue = {
      user: mockUsers[3]!,
      isAuthenticated: true,
      isLoading: false,
      login: async () => {},
      registerOrganization: async () => {},
      logout: async () => {},
      hasRole: () => true,
      updateUser: () => {},
    }
    const user = userEvent.setup()
    const Wrapper = wrapper()
    render(
      <Wrapper>
        <AuthContext.Provider value={authValue}>
          <SelectableTable />
        </AuthContext.Provider>
      </Wrapper>,
    )

    expect(screen.getByRole('checkbox', { name: `Select ${mockUsers[3]!.name}` })).toBeDisabled()
    await user.click(screen.getByRole('checkbox', { name: 'Select all users on this page' }))
    expect(screen.getByTestId('selected')).toHaveTextContent(mockUsers[2]!.id)
    expect(screen.getByTestId('selected')).not.toHaveTextContent(mockUsers[3]!.id)
  })

  it('offers "View as" only on active non-Admin rows other than your own (Module 8)', () => {
    const onViewAs = vi.fn()
    const authValue: AuthContextValue = {
      user: mockUsers[0]!,
      isAuthenticated: true,
      isLoading: false,
      login: async () => {},
      registerOrganization: async () => {},
      logout: async () => {},
      hasRole: () => true,
      updateUser: () => {},
    }
    const Wrapper = wrapper()
    render(
      <Wrapper>
        <AuthContext.Provider value={authValue}>
          <UserTable
            users={[mockUsers[0]!, mockUsers[2]!, { ...mockUsers[3]!, isActive: false }]}
            isLoading={false}
            isError={false}
            onRetry={vi.fn()}
            currentUserId={mockUsers[0]!.id}
            onViewAs={onViewAs}
          />
        </AuthContext.Provider>
      </Wrapper>,
    )

    expect(screen.getAllByRole('button', { name: /^View as / })).toHaveLength(1)
    screen.getByRole('button', { name: `View as ${mockUsers[2]!.name}` }).click()
    expect(onViewAs).toHaveBeenCalledWith(mockUsers[2])
  })
})
