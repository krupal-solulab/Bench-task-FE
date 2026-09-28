import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { server } from '@/test/mocks/server'
import { IssueTemplatesPage } from './IssueTemplatesPage'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

const TEMPLATE = {
  id: 'template-1',
  organizationId: 'org-1',
  projectId: null,
  createdBy: 'u-1',
  name: 'Customer-reported bug',
  issueType: 'Bug',
  titleTemplate: '[Bug] ',
  description: '',
  priority: 'P2',
  labels: [],
  customFieldValues: {},
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function mockTemplates(templates: Array<Record<string, unknown>> = []) {
  server.use(
    http.get(url('/issue-templates'), () => HttpResponse.json({ success: true, data: templates })),
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
  return render(<IssueTemplatesPage />, { wrapper: Wrapper })
}

describe('IssueTemplatesPage (Module 12)', () => {
  it('shows an empty state when there are no issue templates yet', async () => {
    mockTemplates([])
    renderPage()
    expect(await screen.findByText('No issue templates yet')).toBeInTheDocument()
  })

  it('shows a template card with its issue type and Org-wide scope', async () => {
    mockTemplates([TEMPLATE])
    renderPage()
    expect(await screen.findByText('Customer-reported bug')).toBeInTheDocument()
    expect(screen.getByText('Bug · Org-wide')).toBeInTheDocument()
  })

  it('deletes a template via the confirm dialog', async () => {
    let deleteCalled = false
    mockTemplates([TEMPLATE])
    server.use(
      http.delete(url('/issue-templates/template-1'), () => {
        deleteCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Customer-reported bug')
    await user.click(screen.getByRole('button', { name: 'Delete Customer-reported bug' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(deleteCalled).toBe(true))
  })
})
