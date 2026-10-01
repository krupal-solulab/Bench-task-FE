import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { server } from '@/test/mocks/server'
import { ProjectCategoriesPage } from './ProjectCategoriesPage'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

const CATEGORY = {
  id: 'cat-1',
  name: 'Client Work',
  description: 'Billable projects',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function mockCategories(categories: Array<Record<string, unknown>>) {
  server.use(
    http.get(url('/project-categories'), () =>
      HttpResponse.json({ success: true, data: categories }),
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
  return render(<ProjectCategoriesPage />, { wrapper: Wrapper })
}

describe('ProjectCategoriesPage (Module 8 gap-closure)', () => {
  it('shows an empty state when the org has no categories', async () => {
    mockCategories([])
    renderPage()
    expect(await screen.findByText('No categories yet')).toBeInTheDocument()
  })

  it('lists existing categories with their description', async () => {
    mockCategories([CATEGORY])
    renderPage()
    expect(await screen.findByText('Client Work')).toBeInTheDocument()
    expect(screen.getByText('Billable projects')).toBeInTheDocument()
  })

  it('creates a category, sending the trimmed name', async () => {
    mockCategories([])
    let sentBody: unknown = null
    server.use(
      http.post(url('/project-categories'), async ({ request }) => {
        sentBody = await request.json()
        return HttpResponse.json({ success: true, data: { ...CATEGORY, id: 'cat-2' } })
      }),
    )
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /New category/ }))
    await user.type(screen.getByLabelText('Name', { exact: false }), '  Internal  ')
    await user.click(screen.getByRole('button', { name: 'Create category' }))

    await waitFor(() => expect(sentBody).toEqual({ name: 'Internal', description: '' }))
    expect(await screen.findByText('Category created')).toBeInTheDocument()
  })

  it("surfaces the server's in-use message when a delete is refused", async () => {
    mockCategories([CATEGORY])
    server.use(
      http.delete(url('/project-categories/cat-1'), () =>
        HttpResponse.json(
          {
            statusCode: 409,
            message: 'This category is used by 2 projects - reassign them first',
            error: 'Conflict',
            timestamp: new Date().toISOString(),
            path: '',
          },
          { status: 409 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Delete Client Work' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(
      await screen.findByText('This category is used by 2 projects - reassign them first'),
    ).toBeInTheDocument()
  })
})
