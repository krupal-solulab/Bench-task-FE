import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { server } from '@/test/mocks/server'
import { PlatformWorkflowTemplatesPage } from './PlatformWorkflowTemplatesPage'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

const TEMPLATE = {
  id: 'template-1',
  name: 'Bug Tracking',
  description: 'Todo -> In Progress -> Needs QA -> Done',
  workflow: {
    statuses: [
      { name: 'Todo', category: 'To Do' },
      { name: 'In Progress', category: 'In Progress' },
      { name: 'Needs QA', category: 'In Progress' },
      { name: 'Done', category: 'Done' },
    ],
    transitions: [
      { from: 'Todo', to: 'In Progress' },
      { from: 'In Progress', to: 'Needs QA' },
      { from: 'Needs QA', to: 'Done' },
    ],
    initialStatus: 'Todo',
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function mockTemplates(templates: Array<Record<string, unknown>> = []) {
  server.use(
    http.get(url('/workflow-templates'), () =>
      HttpResponse.json({ success: true, data: templates }),
    ),
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
  return render(<PlatformWorkflowTemplatesPage />, { wrapper: Wrapper })
}

describe('PlatformWorkflowTemplatesPage', () => {
  it('shows an empty state when there are no templates yet (regression)', async () => {
    mockTemplates([])
    renderPage()
    expect(await screen.findByText('No workflow templates yet')).toBeInTheDocument()
  })

  it('shows a template card with its status/transition counts', async () => {
    mockTemplates([TEMPLATE])
    renderPage()
    expect(await screen.findByText('Bug Tracking')).toBeInTheDocument()
    expect(screen.getByText('4 statuses, 3 transitions')).toBeInTheDocument()
  })

  it('creates a template via the form and shows a success toast', async () => {
    mockTemplates([])
    let createdBody: Record<string, unknown> | null = null
    server.use(
      http.post(url('/workflow-templates'), async ({ request }) => {
        createdBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ success: true, data: { id: 't-2', ...createdBody } })
      }),
    )
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('No workflow templates yet')
    // Both the header action and the empty-state action share this accessible name.
    await user.click(screen.getAllByRole('button', { name: /New template/ })[0]!)
    await user.type(await screen.findByLabelText(/^Name/), 'Simple Support')
    await user.click(screen.getByRole('button', { name: 'Create template' }))

    await waitFor(() => expect(createdBody).not.toBeNull())
    expect(createdBody).toMatchObject({ name: 'Simple Support' })
    expect(await screen.findByText('Workflow template created')).toBeInTheDocument()
  })

  it('deletes a template via the confirm dialog', async () => {
    let deleteCalled = false
    mockTemplates([TEMPLATE])
    server.use(
      http.delete(url('/workflow-templates/template-1'), () => {
        deleteCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Bug Tracking')
    await user.click(screen.getByRole('button', { name: 'Delete Bug Tracking' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(deleteCalled).toBe(true))
  })

  it('shows an error toast when the server rejects the delete', async () => {
    mockTemplates([TEMPLATE])
    server.use(
      http.delete(url('/workflow-templates/template-1'), () =>
        HttpResponse.json(
          { statusCode: 400, message: 'Cannot delete', error: 'Bad Request' },
          { status: 400 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Bug Tracking')
    await user.click(screen.getByRole('button', { name: 'Delete Bug Tracking' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Could not delete workflow template')).toBeInTheDocument()
  })
})
