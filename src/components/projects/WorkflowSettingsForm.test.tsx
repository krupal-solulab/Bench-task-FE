import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { server } from '@/test/mocks/server'
import { WorkflowSettingsForm } from '@/components/projects/WorkflowSettingsForm'
import type { Workflow } from '@/types/workflow.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

const DEFAULT_WORKFLOW: Workflow = {
  statuses: [
    { name: 'Todo', category: 'To Do' },
    { name: 'In Progress', category: 'In Progress' },
    { name: 'Review', category: 'In Progress' },
    { name: 'Done', category: 'Done' },
  ],
  transitions: [
    { from: 'Todo', to: 'In Progress' },
    { from: 'In Progress', to: 'Review' },
    { from: 'Review', to: 'Done' },
  ],
  initialStatus: 'Todo',
}

function renderForm(workflow: Workflow = DEFAULT_WORKFLOW, canManage = true) {
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
    <WorkflowSettingsForm projectId="p-1" workflow={workflow} canManage={canManage} />,
    { wrapper: Wrapper },
  )
}

describe('WorkflowSettingsForm', () => {
  it('renders every status name and its category', () => {
    renderForm()

    expect(screen.getByDisplayValue('Todo')).toBeInTheDocument()
    expect(screen.getByDisplayValue('In Progress')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Review')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Done')).toBeInTheDocument()
  })

  it('shows a read-only status list (no editing controls) when canManage is false', () => {
    renderForm(DEFAULT_WORKFLOW, false)

    expect(screen.queryByRole('button', { name: 'Save workflow' })).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue('Todo')).not.toBeInTheDocument()
    expect(screen.getByText('Todo', { exact: false })).toBeInTheDocument()
  })

  it('adds a new status via "Add status"', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: /Add status/ }))

    expect(screen.getByLabelText('Status 5 name')).toBeInTheDocument()
  })

  it('removes a status and its transitions referencing it', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByLabelText('Remove status Review'))

    expect(screen.queryByDisplayValue('Review')).not.toBeInTheDocument()
  })

  it('disables Save when a status name is blank or duplicated', async () => {
    const user = userEvent.setup()
    renderForm()

    const doneInput = screen.getByDisplayValue('Done')
    await user.clear(doneInput)
    await user.type(doneInput, 'Todo')

    expect(screen.getByText('Status names must be unique.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save workflow' })).toBeDisabled()
  })

  it('saves the edited workflow via PUT and shows a success toast', async () => {
    let sentBody: Record<string, unknown> | null = null
    server.use(
      http.put(url('/projects/p-1/workflow'), async ({ request }) => {
        sentBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ success: true, data: sentBody })
      }),
    )
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Save workflow' }))

    await waitFor(() => expect(sentBody).not.toBeNull())
    expect(sentBody).toMatchObject({ initialStatus: 'Todo' })
    expect(await screen.findByText('Workflow updated')).toBeInTheDocument()
  })

  it('toggling a transition checkbox and saving sends the updated transition list', async () => {
    let sentBody: { transitions: Array<{ from: string; to: string }> } | null = null
    server.use(
      http.put(url('/projects/p-1/workflow'), async ({ request }) => {
        sentBody = (await request.json()) as typeof sentBody
        return HttpResponse.json({ success: true, data: sentBody })
      }),
    )
    const user = userEvent.setup()
    renderForm()

    // Todo -> Done isn't legal by default; enable it, then save.
    await user.click(screen.getByLabelText('Allow Todo to Done'))
    await user.click(screen.getByRole('button', { name: 'Save workflow' }))

    await waitFor(() => expect(sentBody).not.toBeNull())
    expect(sentBody!.transitions).toContainEqual({ from: 'Todo', to: 'Done' })
  })

  it('resets to the system default via DELETE and shows a success toast', async () => {
    server.use(
      http.delete(url('/projects/p-1/workflow'), () =>
        HttpResponse.json({ success: true, data: DEFAULT_WORKFLOW }),
      ),
    )
    const user = userEvent.setup()
    renderForm({
      statuses: [{ name: 'Backlog', category: 'To Do' }],
      transitions: [],
      initialStatus: 'Backlog',
    })

    await user.click(screen.getByRole('button', { name: 'Reset to default' }))

    expect(await screen.findByText('Workflow reset to the system default')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Todo')).toBeInTheDocument()
  })

  it('shows an error toast when the server rejects the save (e.g. an in-use status removed)', async () => {
    server.use(
      http.put(url('/projects/p-1/workflow'), () =>
        HttpResponse.json(
          { success: false, message: 'Cannot remove status(es) still in use: Review' },
          { status: 409 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Save workflow' }))

    expect(await screen.findByText('Could not update workflow')).toBeInTheDocument()
  })
})
