import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { ToastViewport } from '@/components/common/Toast'
import { CustomRolesPage } from '@/pages/admin/CustomRolesPage'
import { mockCustomRoles } from '@/test/mocks/fixtures'
import { server } from '@/test/mocks/server'
import { renderWithProviders, screen, waitFor, within } from '@/test/utils/render'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function renderPage() {
  return renderWithProviders(
    <>
      <CustomRolesPage />
      <ToastViewport />
    </>,
  )
}

describe('CustomRolesPage', () => {
  it('lists the default roles with their access level and permissions', async () => {
    renderPage()

    const qa = await screen.findByRole('listitem', { name: 'QA role' })
    expect(within(qa).getByText(/Member access/)).toBeInTheDocument()
    const perms = within(qa).getByRole('list', { name: 'QA permissions' })
    expect(within(perms).getAllByLabelText('Allowed')).toHaveLength(2)
    for (const name of ['DevOps', 'Designer', 'Business Analyst']) {
      expect(screen.getByRole('listitem', { name: `${name} role` })).toBeInTheDocument()
    }
  })

  it('creates a role with an access level and chosen permissions', async () => {
    let body: unknown
    server.use(
      http.post(url('/custom-roles'), async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ success: true, data: mockCustomRoles[0] }, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /New role/ }))
    const dialog = await screen.findByRole('dialog', { name: 'New role' })
    await user.type(within(dialog).getByLabelText(/Name/), 'Scrum Master')
    await user.click(within(dialog).getByRole('radio', { name: /Manager/ }))
    await user.click(within(dialog).getByRole('radio', { name: 'emerald' }))
    await user.click(within(dialog).getByRole('checkbox', { name: 'Manage sprints' }))
    await user.click(within(dialog).getByRole('button', { name: 'Create role' }))

    await waitFor(() =>
      expect(body).toEqual({
        name: 'Scrum Master',
        description: '',
        color: 'emerald',
        accessLevel: 'Manager',
        permissions: {
          canCreateTask: false,
          canEditAnyTask: false,
          canDeleteTask: false,
          canChangeAnyTaskStatus: false,
          canManageSprints: true,
          canManageProject: false,
        },
      }),
    )
  })

  it('validates the role name', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /New role/ }))
    await user.click(screen.getByRole('button', { name: 'Create role' }))
    expect(await screen.findByText('Name must be 2-40 characters')).toBeInTheDocument()
  })

  it('explains why a role in use cannot be deleted', async () => {
    server.use(
      http.get(url('/custom-roles'), () =>
        HttpResponse.json({
          success: true,
          data: [{ ...mockCustomRoles[0], memberCount: 3 }],
        }),
      ),
    )
    const user = userEvent.setup()
    renderPage()

    const qa = await screen.findByRole('listitem', { name: 'QA role' })
    expect(within(qa).getByText(/3 people/)).toBeInTheDocument()
    await user.click(within(qa).getByRole('button', { name: /Delete/ }))
    expect((await screen.findAllByText(/3 people have this role/)).length).toBeGreaterThan(0)
  })
})
