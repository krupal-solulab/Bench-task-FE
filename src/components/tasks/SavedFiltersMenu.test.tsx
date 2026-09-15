import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { server } from '@/test/mocks/server'
import { SavedFiltersMenu } from './SavedFiltersMenu'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function renderMenu(onApply = vi.fn()) {
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
  const utils = render(
    <SavedFiltersMenu scope="myTasks" currentQuery={{ priority: 'P1' }} onApply={onApply} />,
    { wrapper: Wrapper },
  )
  return { ...utils, onApply }
}

describe('SavedFiltersMenu', () => {
  it('shows no dropdown when there are no saved filters yet (regression)', async () => {
    server.use(
      http.get(url('/saved-filters'), () => HttpResponse.json({ success: true, data: [] })),
    )
    renderMenu()
    await screen.findByRole('button', { name: /Save current filters/ })
    expect(screen.queryByLabelText('Load a saved filter')).not.toBeInTheDocument()
  })

  it('shows the dropdown once saved filters exist', async () => {
    server.use(
      http.get(url('/saved-filters'), () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: 'sf-1',
              name: 'My P1s',
              scope: 'myTasks',
              projectId: null,
              query: { priority: 'P1' },
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        }),
      ),
    )
    renderMenu()
    expect(await screen.findByLabelText('Load a saved filter')).toBeInTheDocument()
    // No filter selected yet, so there's nothing to delete.
    expect(screen.queryByLabelText('Delete selected saved filter')).not.toBeInTheDocument()
  })

  it('saves the current filters under a given name', async () => {
    let sentBody: Record<string, unknown> | null = null
    server.use(
      http.get(url('/saved-filters'), () => HttpResponse.json({ success: true, data: [] })),
      http.post(url('/saved-filters'), async ({ request }) => {
        sentBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          {
            success: true,
            data: { id: 'sf-new', ...sentBody, createdAt: '2026-01-01T00:00:00.000Z' },
          },
          { status: 201 },
        )
      }),
    )
    const user = userEvent.setup()
    renderMenu()

    await user.click(await screen.findByRole('button', { name: /Save current filters/ }))
    await user.type(screen.getByLabelText('Name', { exact: false }), 'My open P1s')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(sentBody).not.toBeNull())
    expect(sentBody).toMatchObject({
      name: 'My open P1s',
      scope: 'myTasks',
      query: { priority: 'P1' },
    })
    expect(await screen.findByText('Filter saved')).toBeInTheDocument()
  })

  it('disables Save until a name is entered', async () => {
    server.use(
      http.get(url('/saved-filters'), () => HttpResponse.json({ success: true, data: [] })),
    )
    const user = userEvent.setup()
    renderMenu()

    await user.click(await screen.findByRole('button', { name: /Save current filters/ }))
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()

    await user.type(screen.getByLabelText('Name', { exact: false }), 'x')
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
  })
})
