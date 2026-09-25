import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { server } from '@/test/mocks/server'
import { SecuritySchemeAssignment } from './SecuritySchemeAssignment'

// NOTE: same documented Radix Select limitation as PermissionSchemeAssignment.test.tsx -
// coverage here is limited to what's observable without opening the trigger.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function mockSchemes() {
  server.use(
    http.get(url('/security-schemes'), () =>
      HttpResponse.json({
        success: true,
        data: [
          { id: 'scheme-1', organizationId: 'org-1', name: 'Confidentiality', levels: [] },
          { id: 'scheme-2', organizationId: 'org-1', name: 'Strict', levels: [] },
        ],
      }),
    ),
  )
}

function renderAssignment(
  props: Partial<React.ComponentProps<typeof SecuritySchemeAssignment>> = {},
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
    <SecuritySchemeAssignment
      projectId="p-1"
      securitySchemeId={null}
      canManage={false}
      {...props}
    />,
    { wrapper: Wrapper },
  )
}

describe('SecuritySchemeAssignment', () => {
  it('shows "no scheme assigned" in read-only mode when none is assigned (regression)', async () => {
    mockSchemes()
    renderAssignment({ canManage: false, securitySchemeId: null })
    expect(
      await screen.findByText('No scheme assigned - no issue-level view restriction.'),
    ).toBeInTheDocument()
  })

  it('shows the assigned scheme name in read-only mode', async () => {
    mockSchemes()
    renderAssignment({ canManage: false, securitySchemeId: 'scheme-1' })
    expect(await screen.findByText('Confidentiality')).toBeInTheDocument()
  })

  it('renders an editable dropdown when the caller can manage the project', async () => {
    mockSchemes()
    renderAssignment({ canManage: true, securitySchemeId: null })
    expect(await screen.findByLabelText('Security scheme')).toBeInTheDocument()
  })
})
