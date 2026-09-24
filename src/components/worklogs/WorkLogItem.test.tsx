import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { mockUsers } from '@/test/mocks/fixtures'
import { WorkLogItem } from '@/components/worklogs/WorkLogItem'
import type { WorkLog } from '@/types/worklog.types'

const AUTHOR = mockUsers[2]! // Dev One
const OTHER_DEV = mockUsers[3]! // Dev Two
const ADMIN = mockUsers[0]! // Ada Admin

function makeLog(overrides: Partial<WorkLog> = {}): WorkLog {
  return {
    id: 'wl-1',
    task: 't-1',
    user: AUTHOR,
    hours: 2,
    description: 'Investigated the bug',
    workDate: '2026-03-01T00:00:00.000Z',
    billable: true,
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeAuthValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: AUTHOR,
    isAuthenticated: true,
    isLoading: false,
    login: async () => {},
    registerOrganization: async () => {},
    logout: async () => {},
    hasRole: () => false,
    ...overrides,
  }
}

function renderLog(log: WorkLog, authValue: AuthContextValue) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
        </ToastProvider>
      </QueryClientProvider>
    )
  }
  return render(<WorkLogItem log={log} />, { wrapper: Wrapper })
}

describe('WorkLogItem', () => {
  it('shows Edit and Delete for the logging user', () => {
    renderLog(makeLog(), makeAuthValue({ user: AUTHOR }))
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it("shows Edit and Delete for an Admin viewing someone else's log", () => {
    renderLog(
      makeLog({ user: AUTHOR }),
      makeAuthValue({ user: ADMIN, hasRole: (...roles) => roles.includes('Admin') }),
    )
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('hides Edit and Delete for a non-owner, non-admin viewer', () => {
    renderLog(makeLog({ user: AUTHOR }), makeAuthValue({ user: OTHER_DEV }))
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
  })

  it('renders hours, description, and a non-billable badge', () => {
    renderLog(makeLog({ billable: false }), makeAuthValue({ user: AUTHOR }))
    expect(screen.getByText('2h')).toBeInTheDocument()
    expect(screen.getByText('Investigated the bug')).toBeInTheDocument()
    expect(screen.getByText('Non-billable')).toBeInTheDocument()
  })

  it('omits the non-billable badge for billable work', () => {
    renderLog(makeLog({ billable: true }), makeAuthValue({ user: AUTHOR }))
    expect(screen.queryByText('Non-billable')).not.toBeInTheDocument()
  })
})
