import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { server } from '@/test/mocks/server'
import { DashboardCustomizeForm } from './DashboardCustomizeForm'
import type { DashboardWidgetId } from '@/types/dashboard.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

const WIDGETS: Array<{ id: DashboardWidgetId; label: string }> = [
  { id: 'tasksStatus', label: 'Task Status' },
  { id: 'taskTrend', label: 'Task Trend' },
  { id: 'overdueList', label: 'Overdue Tasks' },
]

function renderForm(onOpenChange = vi.fn()) {
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
    <DashboardCustomizeForm
      open
      onOpenChange={onOpenChange}
      availableWidgets={WIDGETS}
      order={['tasksStatus', 'taskTrend', 'overdueList']}
      hidden={[]}
    />,
    { wrapper: Wrapper },
  )
  return { ...utils, onOpenChange }
}

describe('DashboardCustomizeForm', () => {
  it('renders every widget checked (visible) in the given order', () => {
    renderForm()
    const rows = screen.getAllByRole('listitem')
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining('Task Status'),
      expect.stringContaining('Task Trend'),
      expect.stringContaining('Overdue Tasks'),
    ])
    expect(screen.getByLabelText('Show Task Status')).toBeChecked()
  })

  it('disables the up arrow on the first row and the down arrow on the last row', () => {
    renderForm()
    expect(screen.getByLabelText('Move Task Status up')).toBeDisabled()
    expect(screen.getByLabelText('Move Overdue Tasks down')).toBeDisabled()
    expect(screen.getByLabelText('Move Task Trend up')).toBeEnabled()
  })

  it('moving a widget up swaps it with its predecessor', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByLabelText('Move Task Trend up'))

    const rows = screen.getAllByRole('listitem')
    expect(rows[0]!.textContent).toContain('Task Trend')
    expect(rows[1]!.textContent).toContain('Task Status')
  })

  it('unchecking a widget and saving sends it in hiddenWidgets', async () => {
    let sentBody: Record<string, unknown> | null = null
    server.use(
      http.put(url('/dashboard/preferences'), async ({ request }) => {
        sentBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ success: true, data: sentBody })
      }),
    )
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    renderForm(onOpenChange)

    await user.click(screen.getByLabelText('Show Task Trend'))
    await user.click(screen.getByRole('button', { name: 'Save layout' }))

    await waitFor(() => expect(sentBody).not.toBeNull())
    expect(sentBody).toEqual({
      hiddenWidgets: ['taskTrend'],
      widgetOrder: ['tasksStatus', 'taskTrend', 'overdueList'],
    })
    expect(await screen.findByText('Dashboard layout saved')).toBeInTheDocument()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
