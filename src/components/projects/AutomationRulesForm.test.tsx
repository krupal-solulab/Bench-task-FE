import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { server } from '@/test/mocks/server'
import { mockProjects } from '@/test/mocks/fixtures'
import { AutomationRulesForm } from '@/components/projects/AutomationRulesForm'
import type { Project } from '@/types/project.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

const BASE_PROJECT: Project = { ...mockProjects[0]!, id: 'p-1', automationRules: [] }

const DEFAULT_WORKFLOW = {
  statuses: [
    { name: 'Todo', category: 'To Do' },
    { name: 'In Progress', category: 'In Progress' },
    { name: 'Review', category: 'In Progress' },
    { name: 'Done', category: 'Done' },
  ],
  transitions: [],
  initialStatus: 'Todo',
}

function renderForm(project: Project = BASE_PROJECT, canManage = true) {
  server.use(
    http.get(url('/projects/p-1/workflow'), () =>
      HttpResponse.json({ success: true, data: DEFAULT_WORKFLOW }),
    ),
  )
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
  return render(<AutomationRulesForm projectId="p-1" project={project} canManage={canManage} />, {
    wrapper: Wrapper,
  })
}

describe('AutomationRulesForm', () => {
  it('shows a read-only summary (no editing controls) when canManage is false', () => {
    renderForm(
      {
        ...BASE_PROJECT,
        automationRules: [
          {
            id: 'r-1',
            name: 'Auto-label bugs',
            enabled: true,
            trigger: { type: 'IssueCreated', toStatus: null },
            conditions: [],
            actions: [{ type: 'AddLabels', value: 'bug' }],
          },
        ],
      },
      false,
    )

    expect(screen.queryByRole('button', { name: 'Save automation rules' })).not.toBeInTheDocument()
    expect(screen.getByText('Auto-label bugs', { exact: false })).toBeInTheDocument()
  })

  it('adds a rule via "Add rule" and saves it', async () => {
    let sentBody: { rules: Array<Record<string, unknown>> } | null = null
    server.use(
      http.put(url('/projects/p-1/automation-rules'), async ({ request }) => {
        sentBody = (await request.json()) as typeof sentBody
        return HttpResponse.json({
          success: true,
          data: { ...BASE_PROJECT, automationRules: sentBody!.rules },
        })
      }),
    )
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: /Add rule/ }))
    await user.type(screen.getByLabelText('Rule 1 name'), 'Welcome new issues')
    // A freshly added action defaults to AddLabels - just fill in its plain-text value.
    await user.type(screen.getByLabelText('Rule 1 action 1 value'), 'triage')

    await user.click(screen.getByRole('button', { name: 'Save automation rules' }))

    await waitFor(() => expect(sentBody).not.toBeNull())
    expect(sentBody!.rules).toEqual([
      {
        name: 'Welcome new issues',
        enabled: true,
        trigger: { type: 'IssueCreated', toStatus: null },
        conditions: [],
        actions: [{ type: 'AddLabels', value: 'triage' }],
      },
    ])
    expect(await screen.findByText('Automation rules updated')).toBeInTheDocument()
  })

  it('shows a target-status selector only when the trigger is Status Changed', () => {
    renderForm({
      ...BASE_PROJECT,
      automationRules: [
        {
          id: 'r-1',
          name: 'Created rule',
          enabled: true,
          trigger: { type: 'IssueCreated', toStatus: null },
          conditions: [],
          actions: [{ type: 'AddLabels', value: 'a' }],
        },
        {
          id: 'r-2',
          name: 'Status rule',
          enabled: true,
          trigger: { type: 'StatusChanged', toStatus: 'Done' },
          conditions: [],
          actions: [{ type: 'AddLabels', value: 'a' }],
        },
      ],
    })

    expect(screen.queryByLabelText('Rule 1 target status')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Rule 2 target status')).toBeInTheDocument()
  })

  it('disables Save until every rule has a name and at least one action with a value', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: /Add rule/ }))

    expect(screen.getByRole('button', { name: 'Save automation rules' })).toBeDisabled()
  })

  it('removes a rule', async () => {
    const user = userEvent.setup()
    renderForm({
      ...BASE_PROJECT,
      automationRules: [
        {
          id: 'r-1',
          name: 'Rule A',
          enabled: true,
          trigger: { type: 'IssueCreated', toStatus: null },
          conditions: [],
          actions: [{ type: 'AddLabels', value: 'a' }],
        },
      ],
    })

    await user.click(screen.getByLabelText('Remove rule Rule A'))

    expect(screen.queryByDisplayValue('Rule A')).not.toBeInTheDocument()
  })

  it('adds and removes a condition', async () => {
    const user = userEvent.setup()
    renderForm({
      ...BASE_PROJECT,
      automationRules: [
        {
          id: 'r-1',
          name: 'Rule A',
          enabled: true,
          trigger: { type: 'IssueCreated', toStatus: null },
          conditions: [],
          actions: [{ type: 'AddLabels', value: 'a' }],
        },
      ],
    })

    await user.click(screen.getByRole('button', { name: /Condition/ }))
    expect(screen.getByLabelText('Rule 1 condition 1 field')).toBeInTheDocument()

    await user.click(screen.getByLabelText('Remove rule 1 condition 1'))
    expect(screen.queryByLabelText('Rule 1 condition 1 field')).not.toBeInTheDocument()
  })

  it('shows an error toast when the server rejects the save', async () => {
    server.use(
      http.put(url('/projects/p-1/automation-rules'), () =>
        HttpResponse.json(
          { success: false, message: '"Nonexistent" is not a status in this workflow' },
          { status: 400 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderForm({
      ...BASE_PROJECT,
      automationRules: [
        {
          id: 'r-1',
          name: 'Rule A',
          enabled: true,
          trigger: { type: 'IssueCreated', toStatus: null },
          conditions: [],
          actions: [{ type: 'AddLabels', value: 'a' }],
        },
      ],
    })

    await user.click(screen.getByRole('button', { name: 'Save automation rules' }))

    expect(await screen.findByText('Could not update automation rules')).toBeInTheDocument()
  })
})
