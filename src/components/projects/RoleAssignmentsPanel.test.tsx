import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { server } from '@/test/mocks/server'
import { RoleAssignmentsPanel } from './RoleAssignmentsPanel'

// NOTE: same documented Radix Select limitation noted elsewhere in this codebase (UserSelect and
// the team picker are both Radix Selects) - coverage here is limited to what's observable without
// opening a trigger: rendering existing chips and removing one (a plain button click).

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function mockRoles() {
  server.use(
    http.get(url('/project-roles'), () =>
      HttpResponse.json({
        success: true,
        data: [{ id: 'role-1', organizationId: 'org-1', name: 'Deployers', description: '' }],
      }),
    ),
  )
}

function renderPanel(props: Partial<React.ComponentProps<typeof RoleAssignmentsPanel>> = {}) {
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
  return render(<RoleAssignmentsPanel projectId="p-1" roleAssignments={[]} {...props} />, {
    wrapper: Wrapper,
  })
}

describe('RoleAssignmentsPanel', () => {
  it('shows a note when no project roles exist yet', async () => {
    mockRoles()
    server.use(
      http.get(url('/project-roles'), () => HttpResponse.json({ success: true, data: [] })),
    )
    renderPanel()
    expect(
      await screen.findByText(
        'No project roles exist yet - create one from Admin › Project Roles.',
      ),
    ).toBeInTheDocument()
  })

  it('renders a row per project role with its currently assigned users', async () => {
    mockRoles()
    renderPanel({
      roleAssignments: [{ projectRoleId: 'role-1', userIds: ['u-1'], teamIds: [] }],
    })

    expect(await screen.findByText('Deployers')).toBeInTheDocument()
  })

  it('removes an assigned user via its chip button', async () => {
    mockRoles()
    let sentBody: { userIds?: string[]; teamIds?: string[] } | null = null
    server.use(
      http.patch(url('/projects/p-1/role-assignments/role-1'), async ({ request }) => {
        sentBody = (await request.json()) as typeof sentBody
        return HttpResponse.json({
          success: true,
          data: {
            id: 'p-1',
            roleAssignments: [{ projectRoleId: 'role-1', userIds: [], teamIds: [] }],
          },
        })
      }),
      http.get(url('/users/assignable'), () =>
        HttpResponse.json({
          success: true,
          data: [
            { id: 'u-1', name: 'Dev One', email: 'd1@a.com', role: 'Developer', isActive: true },
          ],
          meta: {
            total: 1,
            page: 1,
            limit: 20,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        }),
      ),
    )
    const user = userEvent.setup()
    renderPanel({
      roleAssignments: [{ projectRoleId: 'role-1', userIds: ['u-1'], teamIds: [] }],
    })

    await screen.findByText('Dev One')
    await user.click(screen.getByLabelText('Remove Dev One from Deployers'))

    await waitFor(() => expect(sentBody).not.toBeNull())
    expect(sentBody).toEqual({ userIds: [] })
  })
})
