import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { server } from '@/test/mocks/server'
import { MemberPermissionsEditor } from '@/components/projects/MemberPermissionsEditor'
import { NO_MEMBER_PERMISSIONS } from '@/types/project.types'
import type { ProjectMember } from '@/types/project.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function makeMember(overrides: Partial<ProjectMember> = {}): ProjectMember {
  return {
    user: {
      id: 'dev-1',
      name: 'Dev One',
      email: 'dev@a.com',
      role: 'Developer',
      isActive: true,
      organizationId: 'org-1',
      createdAt: '',
      updatedAt: '',
    },
    role: 'member',
    joinedAt: '2026-01-01T00:00:00.000Z',
    permissions: null,
    ...overrides,
  }
}

function renderEditor(member: ProjectMember, onOpenChange = () => {}) {
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
  return render(
    <MemberPermissionsEditor projectId="p-1" member={member} open onOpenChange={onOpenChange} />,
    { wrapper: Wrapper },
  )
}

describe('MemberPermissionsEditor', () => {
  it('renders every capability unchecked for a member with no grants', () => {
    renderEditor(makeMember())

    expect(screen.getByRole('checkbox', { name: 'Create tasks' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Edit any task' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Delete tasks' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: "Change any task's status" })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Manage sprints' })).not.toBeChecked()
  })

  it("pre-checks the boxes matching the member's existing grants", () => {
    renderEditor(makeMember({ permissions: { ...NO_MEMBER_PERMISSIONS, canCreateTask: true } }))

    expect(screen.getByRole('checkbox', { name: 'Create tasks' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Edit any task' })).not.toBeChecked()
  })

  it('toggling a checkbox and saving sends the full updated permission set as a PATCH', async () => {
    let sentBody: Record<string, unknown> | null = null
    server.use(
      http.patch(url('/projects/p-1/members/dev-1/permissions'), async ({ request }) => {
        sentBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ success: true, data: {} })
      }),
    )
    const user = userEvent.setup()
    renderEditor(makeMember())

    await user.click(screen.getByRole('checkbox', { name: 'Manage sprints' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(sentBody).not.toBeNull())
    expect(sentBody).toEqual({ ...NO_MEMBER_PERMISSIONS, canManageSprints: true })
    expect(await screen.findByText('Permissions updated')).toBeInTheDocument()
  })

  it('shows an error toast when the save fails', async () => {
    server.use(
      http.patch(url('/projects/p-1/members/dev-1/permissions'), () =>
        HttpResponse.json({ success: false, message: 'Not allowed' }, { status: 403 }),
      ),
    )
    const user = userEvent.setup()
    renderEditor(makeMember())

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Could not update permissions')).toBeInTheDocument()
  })

  it('closes when Cancel is clicked', async () => {
    let closed = false
    const user = userEvent.setup()
    renderEditor(makeMember(), () => {
      closed = true
    })

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(closed).toBe(true)
  })
})
