import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { server } from '@/test/mocks/server'
import { SlaPolicySettingsForm } from './SlaPolicySettingsForm'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

const DEFAULT_POLICY = [
  { priority: 'P1', resolutionHours: 8 },
  { priority: 'P2', resolutionHours: 24 },
  { priority: 'P3', resolutionHours: 72 },
]

function renderForm(canManage = true) {
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
  return render(<SlaPolicySettingsForm projectId="p-1" canManage={canManage} />, {
    wrapper: Wrapper,
  })
}

describe('SlaPolicySettingsForm', () => {
  it('shows the system default policy for a project with no override (regression)', async () => {
    server.use(
      http.get(url('/projects/p-1/sla-policy'), () =>
        HttpResponse.json({ success: true, data: DEFAULT_POLICY }),
      ),
    )
    renderForm()

    expect(await screen.findByLabelText('P1 resolution hours')).toHaveValue(8)
    expect(screen.getByLabelText('P2 resolution hours')).toHaveValue(24)
    expect(screen.getByLabelText('P3 resolution hours')).toHaveValue(72)
  })

  it('shows a read-only summary (no editing controls) when canManage is false', async () => {
    server.use(
      http.get(url('/projects/p-1/sla-policy'), () =>
        HttpResponse.json({ success: true, data: DEFAULT_POLICY }),
      ),
    )
    renderForm(false)

    expect(await screen.findByText('P1: 8 hours to resolve')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save SLA policy' })).not.toBeInTheDocument()
  })

  it('saves an edited policy', async () => {
    let sentBody: Record<string, unknown> | null = null
    server.use(
      http.get(url('/projects/p-1/sla-policy'), () =>
        HttpResponse.json({ success: true, data: DEFAULT_POLICY }),
      ),
      http.put(url('/projects/p-1/sla-policy'), async ({ request }) => {
        sentBody = (await request.json()) as Record<string, unknown>
        const entries = (sentBody as { entries: unknown }).entries
        return HttpResponse.json({ success: true, data: entries })
      }),
    )
    const user = userEvent.setup()
    renderForm()

    const p1Input = await screen.findByLabelText('P1 resolution hours')
    await user.clear(p1Input)
    await user.type(p1Input, '4')
    await user.click(screen.getByRole('button', { name: 'Save SLA policy' }))

    await waitFor(() => expect(sentBody).not.toBeNull())
    expect(sentBody).toEqual({
      entries: [
        { priority: 'P1', resolutionHours: 4 },
        { priority: 'P2', resolutionHours: 24 },
        { priority: 'P3', resolutionHours: 72 },
      ],
    })
    expect(await screen.findByText('SLA policy updated')).toBeInTheDocument()
  })

  it('resets to the default policy', async () => {
    let sentBody: Record<string, unknown> | null = null
    server.use(
      http.get(url('/projects/p-1/sla-policy'), () =>
        HttpResponse.json({
          success: true,
          data: [{ priority: 'P1', resolutionHours: 4 }],
        }),
      ),
      http.put(url('/projects/p-1/sla-policy'), async ({ request }) => {
        sentBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ success: true, data: DEFAULT_POLICY })
      }),
    )
    const user = userEvent.setup()
    renderForm()

    await screen.findByLabelText('P1 resolution hours')
    await user.click(screen.getByRole('button', { name: 'Reset to default' }))

    await waitFor(() => expect(sentBody).toEqual({ entries: [] }))
    expect(await screen.findByText('SLA policy reset to the default')).toBeInTheDocument()
    expect(screen.getByLabelText('P1 resolution hours')).toHaveValue(8)
  })
})
