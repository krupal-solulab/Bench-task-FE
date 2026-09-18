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
import { CustomFieldOverridesForm } from '@/components/projects/CustomFieldOverridesForm'
import type { Project } from '@/types/project.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

const BASE_PROJECT: Project = {
  ...mockProjects[0]!,
  id: 'p-1',
  // A single Standard-level type so "Task" is unambiguously the default selected issue type
  // (resolveIssueTypes falls back to the 5 built-in types, Epic first, when this is empty).
  issueTypes: [{ name: 'Task', level: 'standard', icon: 'CheckSquare', color: 'blue' }],
  customFields: [
    { id: 'f-1', name: 'Root Cause', type: 'Text', required: false, options: null },
    { id: 'f-2', name: 'Severity', type: 'Dropdown', required: false, options: ['Low', 'High'] },
  ],
}

const EMPTY_OVERRIDE = {
  issueType: 'Task',
  hiddenFieldIds: [],
  requiredFieldIds: [],
  optionalFieldIds: [],
}

function renderForm(project: Project = BASE_PROJECT, canManage = true) {
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
    <CustomFieldOverridesForm projectId="p-1" project={project} canManage={canManage} />,
    { wrapper: Wrapper },
  )
}

describe('CustomFieldOverridesForm', () => {
  it('renders nothing when the project has no custom fields (regression)', () => {
    server.use(
      http.get(url('/projects/p-1/custom-field-overrides'), () =>
        HttpResponse.json({ success: true, data: EMPTY_OVERRIDE }),
      ),
    )
    renderForm({ ...BASE_PROJECT, customFields: [] })
    expect(screen.queryByText('Field overrides per issue type')).not.toBeInTheDocument()
  })

  it("reflects the fetched override's checkbox state for the default issue type", async () => {
    server.use(
      http.get(url('/projects/p-1/custom-field-overrides'), () =>
        HttpResponse.json({
          success: true,
          data: { ...EMPTY_OVERRIDE, hiddenFieldIds: ['f-1'], requiredFieldIds: ['f-2'] },
        }),
      ),
    )
    renderForm()

    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: 'Hide Root Cause for Task' })).toBeChecked(),
    )
    expect(screen.getByRole('checkbox', { name: 'Force Severity required for Task' })).toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: 'Force Root Cause required for Task' }),
    ).not.toBeChecked()
  })

  it('saves a hidden-field override', async () => {
    let sentBody: Record<string, unknown> | null = null
    server.use(
      http.get(url('/projects/p-1/custom-field-overrides'), () =>
        HttpResponse.json({ success: true, data: EMPTY_OVERRIDE }),
      ),
      http.put(url('/projects/p-1/custom-field-overrides'), async ({ request }) => {
        sentBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({
          success: true,
          data: { ...EMPTY_OVERRIDE, hiddenFieldIds: ['f-1'] },
        })
      }),
    )
    const user = userEvent.setup()
    renderForm()

    await user.click(await screen.findByRole('checkbox', { name: 'Hide Root Cause for Task' }))
    await user.click(screen.getByRole('button', { name: 'Save override' }))

    await waitFor(() => expect(sentBody).not.toBeNull())
    expect(sentBody).toEqual({
      hiddenFieldIds: ['f-1'],
      requiredFieldIds: [],
      optionalFieldIds: [],
    })
    expect(await screen.findByText('Field override updated')).toBeInTheDocument()
  })

  it('checking Required for a field automatically unchecks Optional for it, and vice versa', async () => {
    server.use(
      http.get(url('/projects/p-1/custom-field-overrides'), () =>
        HttpResponse.json({
          success: true,
          data: { ...EMPTY_OVERRIDE, optionalFieldIds: ['f-1'] },
        }),
      ),
    )
    const user = userEvent.setup()
    renderForm()

    const requiredBox = screen.getByRole('checkbox', { name: 'Force Root Cause required for Task' })
    const optionalBox = screen.getByRole('checkbox', { name: 'Force Root Cause optional for Task' })
    await waitFor(() => expect(optionalBox).toBeChecked())

    await user.click(requiredBox)

    expect(requiredBox).toBeChecked()
    expect(optionalBox).not.toBeChecked()
  })

  it('shows a read-only summary (no editing controls) when canManage is false', async () => {
    server.use(
      http.get(url('/projects/p-1/custom-field-overrides'), () =>
        HttpResponse.json({ success: true, data: { ...EMPTY_OVERRIDE, hiddenFieldIds: ['f-1'] } }),
      ),
    )
    renderForm(BASE_PROJECT, false)

    expect(screen.queryByRole('button', { name: 'Save override' })).not.toBeInTheDocument()
    expect(await screen.findByText('Root Cause: hidden for Task')).toBeInTheDocument()
  })
})
