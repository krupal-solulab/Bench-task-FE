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
import { FieldsSettingsForm } from '@/components/projects/FieldsSettingsForm'
import type { Project } from '@/types/project.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

const BASE_PROJECT: Project = { ...mockProjects[0]!, id: 'p-1', components: [], customFields: [] }

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
  return render(<FieldsSettingsForm projectId="p-1" project={project} canManage={canManage} />, {
    wrapper: Wrapper,
  })
}

describe('FieldsSettingsForm', () => {
  it('shows a read-only summary (no editing controls) when canManage is false', () => {
    renderForm({ ...BASE_PROJECT, components: ['Frontend'] }, false)

    expect(screen.queryByRole('button', { name: 'Save components' })).not.toBeInTheDocument()
    expect(screen.getByText('Frontend')).toBeInTheDocument()
  })

  it('adds a component row via "Add component" and saves it', async () => {
    let sentBody: Record<string, unknown> | null = null
    server.use(
      http.put(url('/projects/p-1/components'), async ({ request }) => {
        sentBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ success: true, data: { ...BASE_PROJECT, components: ['API'] } })
      }),
    )
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: /Add component/ }))
    await user.type(screen.getByLabelText('Component 1 name'), 'API')
    await user.click(screen.getByRole('button', { name: 'Save components' }))

    await waitFor(() => expect(sentBody).not.toBeNull())
    expect(sentBody).toEqual({ names: ['API'] })
    expect(await screen.findByText('Components updated')).toBeInTheDocument()
  })

  it('removes a component row', async () => {
    const user = userEvent.setup()
    renderForm({ ...BASE_PROJECT, components: ['Frontend', 'API'] })

    await user.click(screen.getByLabelText('Remove component Frontend'))

    expect(screen.queryByDisplayValue('Frontend')).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('API')).toBeInTheDocument()
  })

  it('disables Save components when a name is blank or duplicated', async () => {
    const user = userEvent.setup()
    renderForm({ ...BASE_PROJECT, components: ['Frontend'] })

    await user.click(screen.getByRole('button', { name: /Add component/ }))
    await user.type(screen.getByLabelText('Component 2 name'), 'Frontend')

    expect(screen.getByText('Component names must be unique.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save components' })).toBeDisabled()
  })

  it('adds a new Text field via "Add field" and saves', async () => {
    let sentBody: {
      fields: Array<{ name: string; type: string; options: string[] | null }>
    } | null = null
    server.use(
      http.put(url('/projects/p-1/custom-fields'), async ({ request }) => {
        sentBody = (await request.json()) as typeof sentBody
        return HttpResponse.json({
          success: true,
          data: {
            ...BASE_PROJECT,
            customFields: sentBody!.fields.map((f, i) => ({ id: `f-${i}`, required: false, ...f })),
          },
        })
      }),
    )
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: /Add field/ }))
    await user.type(screen.getByLabelText('Field 1 name'), 'Root Cause')
    await user.click(screen.getByRole('button', { name: 'Save custom fields' }))

    await waitFor(() => expect(sentBody).not.toBeNull())
    expect(sentBody!.fields).toEqual([
      { name: 'Root Cause', type: 'Text', required: false, options: null },
    ])
    expect(await screen.findByText('Custom fields updated')).toBeInTheDocument()
  })

  it('requires at least one option for a Dropdown field before it can be saved', async () => {
    const user = userEvent.setup()
    renderForm({
      ...BASE_PROJECT,
      customFields: [
        { id: 'f-1', name: 'Severity', type: 'Dropdown', required: false, options: [] },
      ],
    })

    expect(screen.getByRole('button', { name: 'Save custom fields' })).toBeDisabled()

    await user.type(screen.getByPlaceholderText('Type an option and press Enter'), 'Low{Enter}')

    expect(screen.getByRole('button', { name: 'Save custom fields' })).toBeEnabled()
  })

  it('shows an error toast when the server rejects the save (e.g. a type change on an in-use field)', async () => {
    server.use(
      http.put(url('/projects/p-1/custom-fields'), () =>
        HttpResponse.json(
          { success: false, message: "Cannot change field type once it's in use" },
          { status: 400 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderForm({
      ...BASE_PROJECT,
      customFields: [{ id: 'f-1', name: 'Cost', type: 'Number', required: false, options: null }],
    })

    await user.click(screen.getByRole('button', { name: 'Save custom fields' }))

    expect(await screen.findByText('Could not update custom fields')).toBeInTheDocument()
  })
})
