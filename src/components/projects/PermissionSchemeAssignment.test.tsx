import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { server } from '@/test/mocks/server'
import { PermissionSchemeAssignment } from './PermissionSchemeAssignment'

// NOTE: Radix `Select` (used here for the editable dropdown) reliably hangs under
// userEvent-driven "open, then click an option" flows in this jsdom + vitest environment (see
// NotificationBell.test.tsx for a documented minimal repro of the same limitation with
// DropdownMenu) - coverage here is limited to what's observable without opening the trigger.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function mockSchemes() {
  server.use(
    http.get(url('/permission-schemes'), () =>
      HttpResponse.json({
        success: true,
        data: [
          { id: 'scheme-1', organizationId: 'org-1', name: 'Strict', grants: [] },
          { id: 'scheme-2', organizationId: 'org-1', name: 'Open', grants: [] },
        ],
      }),
    ),
  )
}

function renderAssignment(
  props: Partial<React.ComponentProps<typeof PermissionSchemeAssignment>> = {},
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    )
  }
  return render(
    <PermissionSchemeAssignment
      projectId="p-1"
      permissionSchemeId={null}
      canManage={false}
      {...props}
    />,
    { wrapper: Wrapper },
  )
}

describe('PermissionSchemeAssignment', () => {
  it('shows "no scheme assigned" in read-only mode when none is assigned (regression)', async () => {
    mockSchemes()
    renderAssignment({ canManage: false, permissionSchemeId: null })
    expect(
      await screen.findByText('No scheme assigned - default role permissions apply.'),
    ).toBeInTheDocument()
  })

  it('shows the assigned scheme name in read-only mode', async () => {
    mockSchemes()
    renderAssignment({ canManage: false, permissionSchemeId: 'scheme-1' })
    expect(await screen.findByText('Strict')).toBeInTheDocument()
  })

  it('renders an editable dropdown when the caller can manage the project', async () => {
    mockSchemes()
    renderAssignment({ canManage: true, permissionSchemeId: null })
    expect(await screen.findByLabelText('Permission scheme')).toBeInTheDocument()
  })
})
