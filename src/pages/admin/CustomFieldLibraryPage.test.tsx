import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { server } from '@/test/mocks/server'
import { AddLibraryFieldControl } from '@/components/projects/AddLibraryFieldControl'
import { CustomFieldLibraryPage } from './CustomFieldLibraryPage'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

const ENTRY = {
  id: 'lib-1',
  name: 'Severity',
  type: 'Dropdown',
  options: ['Low', 'High'],
  description: 'Shared triage field',
  projectCount: 2,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function mockLibrary(entries: Array<Record<string, unknown>>) {
  server.use(
    http.get(url('/custom-field-library'), () =>
      HttpResponse.json({ success: true, data: entries }),
    ),
  )
}

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          {children}
          <ToastViewport />
        </ToastProvider>
      </QueryClientProvider>
    )
  }
}

describe('CustomFieldLibraryPage (Module 8 gap-closure)', () => {
  it('lists library fields with their options and project usage', async () => {
    mockLibrary([ENTRY])
    render(<CustomFieldLibraryPage />, { wrapper: wrapper() })
    expect(await screen.findByText('Severity')).toBeInTheDocument()
    expect(screen.getByText('Dropdown · Low, High')).toBeInTheDocument()
    expect(screen.getByText('Used by 2 projects')).toBeInTheDocument()
  })

  it('creates a Text field without sending options', async () => {
    mockLibrary([])
    let sentBody: unknown = null
    server.use(
      http.post(url('/custom-field-library'), async ({ request }) => {
        sentBody = await request.json()
        return HttpResponse.json({ success: true, data: { ...ENTRY, id: 'lib-2' } })
      }),
    )
    const user = userEvent.setup()
    render(<CustomFieldLibraryPage />, { wrapper: wrapper() })

    await user.click(await screen.findByRole('button', { name: /New field/ }))
    await user.type(screen.getByLabelText('Name', { exact: false }), 'Customer')
    await user.click(screen.getByRole('button', { name: 'Create field' }))

    await waitFor(() =>
      expect(sentBody).toEqual({ name: 'Customer', type: 'Text', description: '' }),
    )
  })

  it('edits name/options but never sends the (locked) type', async () => {
    mockLibrary([ENTRY])
    let sentBody: unknown = null
    server.use(
      http.patch(url('/custom-field-library/lib-1'), async ({ request }) => {
        sentBody = await request.json()
        return HttpResponse.json({ success: true, data: ENTRY })
      }),
    )
    const user = userEvent.setup()
    render(<CustomFieldLibraryPage />, { wrapper: wrapper() })

    await user.click(await screen.findByRole('button', { name: 'Edit Severity' }))
    expect(screen.getByRole('combobox', { name: 'Type' })).toBeDisabled()
    const options = screen.getByLabelText('Options (one per line)', { exact: false })
    await user.type(options, '\nCritical')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(sentBody).toEqual({
        name: 'Severity',
        description: 'Shared triage field',
        options: ['Low', 'High', 'Critical'],
      }),
    )
  })
})

describe('AddLibraryFieldControl (Module 8 gap-closure)', () => {
  it('hides itself for non-managers and when every library field is already on the project', async () => {
    mockLibrary([ENTRY])
    const { rerender } = render(
      <AddLibraryFieldControl projectId="p-1" project={{ customFields: [] }} canManage={false} />,
      { wrapper: wrapper() },
    )
    expect(screen.queryByText('Add from the org field library')).toBeNull()

    rerender(
      <AddLibraryFieldControl
        projectId="p-1"
        project={{
          customFields: [
            { id: 'lib-1', name: 'Severity', type: 'Dropdown', required: false, options: [] },
          ],
        }}
        canManage
      />,
    )
    await waitFor(() => expect(screen.queryByText('Add from the org field library')).toBeNull())
  })

  it('offers library fields the project does not have yet', async () => {
    mockLibrary([ENTRY])
    render(<AddLibraryFieldControl projectId="p-1" project={{ customFields: [] }} canManage />, {
      wrapper: wrapper(),
    })
    expect(await screen.findByText('Add from the org field library')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add library field' })).toBeDisabled()
  })
})
