import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { server } from '@/test/mocks/server'
import { DefaultApproversForm } from '@/components/projects/DefaultApproversForm'
import type { DefaultApproversPayload } from '@/types/project.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`
const PROJECT_ID = 'p-1'

function renderForm(defaultApprovers: DefaultApproversPayload | null = null, canManage = true) {
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
    <DefaultApproversForm
      projectId={PROJECT_ID}
      defaultApprovers={defaultApprovers}
      canManage={canManage}
    />,
    { wrapper: Wrapper },
  )
}

describe('DefaultApproversForm (Module 6 gap-closure)', () => {
  it('shows "None configured" in the read-only view when nothing is set', () => {
    renderForm(null, false)
    expect(screen.getByText('None configured.')).toBeInTheDocument()
  })

  it('shows the configured roles and users in the read-only view', () => {
    renderForm(
      {
        allowedRoles: ['Manager'],
        allowedUserIds: [],
        allowedTeamIds: [],
        allowedProjectRoleIds: [],
      },
      false,
    )
    expect(screen.getByText('Manager')).toBeInTheDocument()
  })

  it('toggles a role checkbox and saves the grant', async () => {
    let sentBody: Record<string, unknown> | null = null
    server.use(
      http.patch(url(`/projects/${PROJECT_ID}/default-approvers`), async ({ request }) => {
        sentBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({
          success: true,
          data: {
            defaultApprovers: {
              allowedRoles: ['Manager'],
              allowedUserIds: [],
              allowedTeamIds: [],
              allowedProjectRoleIds: [],
            },
          },
        })
      }),
    )
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByLabelText('Let Manager approve any transition by default'))
    await user.click(screen.getByRole('button', { name: 'Save default approvers' }))

    await waitFor(() => expect(sentBody).not.toBeNull())
    expect(sentBody).toEqual({
      allowedRoles: ['Manager'],
      allowedUserIds: [],
      allowedTeamIds: [],
      allowedProjectRoleIds: [],
    })
    expect(await screen.findByText('Default approvers updated')).toBeInTheDocument()
  })

  it('removes an already-configured user via its chip button', async () => {
    let sentBody: Record<string, unknown> | null = null
    server.use(
      http.patch(url(`/projects/${PROJECT_ID}/default-approvers`), async ({ request }) => {
        sentBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({
          success: true,
          data: { defaultApprovers: sentBody },
        })
      }),
    )
    const user = userEvent.setup()
    renderForm({
      allowedRoles: [],
      allowedUserIds: ['u-1'],
      allowedTeamIds: [],
      allowedProjectRoleIds: [],
    })

    await user.click(screen.getByLabelText(/Remove .* as a default approver/))
    await user.click(screen.getByRole('button', { name: 'Save default approvers' }))

    await waitFor(() => expect(sentBody).not.toBeNull())
    expect((sentBody as unknown as DefaultApproversPayload).allowedUserIds).toEqual([])
  })

  it('shows an error toast when the save fails', async () => {
    server.use(
      http.patch(url(`/projects/${PROJECT_ID}/default-approvers`), () =>
        HttpResponse.json({ success: false, message: 'Nope' }, { status: 403 }),
      ),
    )
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Save default approvers' }))

    expect(await screen.findByText('Could not update default approvers')).toBeInTheDocument()
  })
})
