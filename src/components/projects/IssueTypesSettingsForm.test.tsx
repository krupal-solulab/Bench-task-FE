import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { server } from '@/test/mocks/server'
import { IssueTypesSettingsForm } from './IssueTypesSettingsForm'
import type { Project } from '@/types/project.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p-1',
    name: 'Project A',
    description: '',
    status: 'In Progress',
    owner: {
      id: 'u-1',
      name: 'Owner',
      email: 'o@a.com',
      role: 'Admin',
      isActive: true,
      organizationId: 'org-1',
      createdAt: '',
      updatedAt: '',
    },
    members: [],
    startDate: '2026-01-01T00:00:00.000Z',
    dueDate: null,
    taskCount: 0,
    components: [],
    customFields: [],
    automationRules: [],
    issueTypes: [],
    permissionSchemeId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderForm(project: Project, canManage = true) {
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
    <IssueTypesSettingsForm projectId={project.id} project={project} canManage={canManage} />,
    { wrapper: Wrapper },
  )
}

describe('IssueTypesSettingsForm', () => {
  it('pre-fills the 5 built-in types when the project has no custom config (regression)', () => {
    renderForm(makeProject())
    expect(screen.getByDisplayValue('Epic')).toBeDisabled()
    expect(screen.getByDisplayValue('Story')).toBeEnabled()
    expect(screen.getByDisplayValue('Task')).toBeEnabled()
    expect(screen.getByDisplayValue('Bug')).toBeEnabled()
    expect(screen.getByDisplayValue('Sub-task')).toBeDisabled()
    expect(screen.queryByLabelText('Remove issue type Epic')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Remove issue type Story')).toBeInTheDocument()
  })

  it('shows read-only badges when the caller cannot manage the project', () => {
    renderForm(makeProject(), false)
    expect(screen.queryByRole('button', { name: 'Save issue types' })).not.toBeInTheDocument()
    expect(screen.getByText('Task')).toBeInTheDocument()
  })

  it('adds a new Standard-level type and saves the full list', async () => {
    let sentBody: Record<string, unknown> | null = null
    server.use(
      http.put(url('/projects/p-1/issue-types'), async ({ request }) => {
        sentBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({
          success: true,
          data: makeProject({ issueTypes: sentBody.issueTypes as never }),
        })
      }),
    )
    const user = userEvent.setup()
    renderForm(makeProject())

    await user.click(screen.getByRole('button', { name: /Add Standard type/ }))
    const nameInputs = screen.getAllByLabelText(/Issue type \d+ name/)
    await user.type(nameInputs[nameInputs.length - 1]!, 'Chore')
    await user.click(screen.getByRole('button', { name: 'Save issue types' }))

    await waitFor(() => expect(sentBody).not.toBeNull())
    const issueTypes = sentBody!.issueTypes as Array<{ name: string; level: string }>
    expect(issueTypes.map((t) => t.name)).toContain('Chore')
    expect(issueTypes.find((t) => t.name === 'Chore')?.level).toBe('standard')
  })

  it('disables Save when renaming a type to a name already in use (duplicate)', async () => {
    const user = userEvent.setup()
    renderForm(makeProject())

    const bugInput = screen.getByDisplayValue('Bug')
    await user.clear(bugInput)
    await user.type(bugInput, 'Task')

    expect(screen.getByRole('button', { name: 'Save issue types' })).toBeDisabled()
    expect(screen.getByText('Issue type names must be unique.')).toBeInTheDocument()
  })
})
