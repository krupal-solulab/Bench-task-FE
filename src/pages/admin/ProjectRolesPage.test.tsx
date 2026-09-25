import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { server } from '@/test/mocks/server'
import { ProjectRolesPage } from './ProjectRolesPage'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

const ROLE = {
  id: 'role-1',
  organizationId: 'org-1',
  name: 'QA Lead',
  description: 'Owns test sign-off',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function mockRoles(roles: Array<Record<string, unknown>> = []) {
  server.use(
    http.get(url('/project-roles'), () => HttpResponse.json({ success: true, data: roles })),
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
  return render(<ProjectRolesPage />, { wrapper: Wrapper })
}

describe('ProjectRolesPage (Module 6 - Teams, Project Roles & Security Schemes)', () => {
  it('shows an empty state when there are no project roles yet', async () => {
    mockRoles([])
    renderPage()
    expect(await screen.findByText('No project roles yet')).toBeInTheDocument()
  })

  it('shows a role card', async () => {
    mockRoles([ROLE])
    renderPage()
    expect(await screen.findByText('QA Lead')).toBeInTheDocument()
    expect(screen.getByText('Owns test sign-off')).toBeInTheDocument()
  })

  it('deletes a project role via the confirm dialog', async () => {
    let deleteCalled = false
    mockRoles([ROLE])
    server.use(
      http.delete(url('/project-roles/role-1'), () => {
        deleteCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('QA Lead')
    await user.click(screen.getByRole('button', { name: 'Delete QA Lead' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(deleteCalled).toBe(true))
  })

  it('shows an error toast when deleting a role still assigned on a project', async () => {
    mockRoles([ROLE])
    server.use(
      http.delete(url('/project-roles/role-1'), () =>
        HttpResponse.json(
          {
            statusCode: 400,
            message: 'This role is assigned on one or more projects',
            error: 'Bad Request',
          },
          { status: 400 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('QA Lead')
    await user.click(screen.getByRole('button', { name: 'Delete QA Lead' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Could not delete project role')).toBeInTheDocument()
  })
})
