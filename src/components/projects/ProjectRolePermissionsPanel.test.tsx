import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { ProjectRolePermissionsPanel } from '@/components/projects/ProjectRolePermissionsPanel'
import { server } from '@/test/mocks/server'
import { renderWithProviders, screen, waitFor } from '@/test/utils/render'
import type { MemberPermissions, ProjectRolePermissionRow } from '@/types/project.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

const NONE: MemberPermissions = {
  canCreateTask: false,
  canEditAnyTask: false,
  canDeleteTask: false,
  canChangeAnyTaskStatus: false,
  canManageSprints: false,
  canManageProject: false,
}

const rows: ProjectRolePermissionRow[] = [
  {
    roleId: 'r-dev',
    name: 'Developer',
    color: 'slate',
    builtInRole: 'Developer',
    defaults: NONE,
    override: null,
    effective: NONE,
  },
  {
    roleId: 'r-qa',
    name: 'QA',
    color: 'violet',
    builtInRole: null,
    defaults: { ...NONE, canCreateTask: true },
    override: { ...NONE, canCreateTask: true, canManageProject: true },
    effective: { ...NONE, canCreateTask: true, canManageProject: true },
  },
]

describe('ProjectRolePermissionsPanel', () => {
  it('shows each role with org defaults vs. this-project overrides', async () => {
    server.use(
      http.get(url('/projects/p-1/role-permissions'), () =>
        HttpResponse.json({ success: true, data: rows }),
      ),
    )
    renderWithProviders(<ProjectRolePermissionsPanel projectId="p-1" canEdit />)

    expect(await screen.findByText('Custom here')).toBeInTheDocument()
    expect(screen.getByText('Org default')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'QA: Manage project' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Developer: Manage project' })).not.toBeChecked()
  })

  it('an Admin overrides a role for this project only, and can reset it', async () => {
    let putBody: unknown
    let reset = false
    server.use(
      http.get(url('/projects/p-1/role-permissions'), () =>
        HttpResponse.json({ success: true, data: rows }),
      ),
      http.put(url('/projects/p-1/role-permissions/r-dev'), async ({ request }) => {
        putBody = await request.json()
        return HttpResponse.json({ success: true, data: rows })
      }),
      http.delete(url('/projects/p-1/role-permissions/r-qa'), () => {
        reset = true
        return HttpResponse.json({ success: true, data: rows })
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(<ProjectRolePermissionsPanel projectId="p-1" canEdit />)

    await user.click(await screen.findByRole('checkbox', { name: 'Developer: Create tasks' }))
    await waitFor(() => expect(putBody).toEqual({ ...NONE, canCreateTask: true }))

    await user.click(screen.getByRole('button', { name: 'Reset QA to organization defaults' }))
    await waitFor(() => expect(reset).toBe(true))
  })

  it('is read-only for non-Admins', async () => {
    server.use(
      http.get(url('/projects/p-1/role-permissions'), () =>
        HttpResponse.json({ success: true, data: rows }),
      ),
    )
    renderWithProviders(<ProjectRolePermissionsPanel projectId="p-1" canEdit={false} />)

    expect(await screen.findByRole('checkbox', { name: 'QA: Manage project' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: /Reset/ })).not.toBeInTheDocument()
  })
})
