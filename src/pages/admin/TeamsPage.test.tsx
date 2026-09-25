import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { server } from '@/test/mocks/server'
import { TeamsPage } from './TeamsPage'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

const TEAM = {
  id: 'team-1',
  organizationId: 'org-1',
  name: 'Backend Guild',
  description: 'Owns the API',
  leadId: { id: 'u-1', name: 'Ada Admin', email: 'a@a.com', role: 'Admin', isActive: true },
  memberIds: [{ id: 'u-2', name: 'Dev One', email: 'd@a.com', role: 'Developer', isActive: true }],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function mockTeams(teams: Array<Record<string, unknown>> = []) {
  server.use(http.get(url('/teams'), () => HttpResponse.json({ success: true, data: teams })))
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
  return render(<TeamsPage />, { wrapper: Wrapper })
}

describe('TeamsPage (Module 6 - Teams, Project Roles & Security Schemes)', () => {
  it('shows an empty state when there are no teams yet', async () => {
    mockTeams([])
    renderPage()
    expect(await screen.findByText('No teams yet')).toBeInTheDocument()
  })

  it('shows a team card with its lead and member count', async () => {
    mockTeams([TEAM])
    renderPage()
    expect(await screen.findByText('Backend Guild')).toBeInTheDocument()
    expect(screen.getByText('Owns the API')).toBeInTheDocument()
    expect(screen.getByText(/Lead: Ada Admin/)).toBeInTheDocument()
    expect(screen.getByText('1 member')).toBeInTheDocument()
  })

  it('deletes a team via the confirm dialog', async () => {
    let deleteCalled = false
    mockTeams([TEAM])
    server.use(
      http.delete(url('/teams/team-1'), () => {
        deleteCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Backend Guild')
    await user.click(screen.getByRole('button', { name: 'Delete Backend Guild' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(deleteCalled).toBe(true))
  })
})
