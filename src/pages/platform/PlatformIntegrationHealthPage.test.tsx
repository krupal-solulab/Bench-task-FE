import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { PlatformIntegrationHealthPage } from '@/pages/platform/PlatformIntegrationHealthPage'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function mockHealth(entries: Array<Record<string, unknown>>) {
  server.use(
    http.get(url('/platform/integrations/health'), () =>
      HttpResponse.json({ success: true, data: entries }),
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
  return render(<PlatformIntegrationHealthPage />, { wrapper: Wrapper })
}

describe('PlatformIntegrationHealthPage', () => {
  it('renders a status entry per integration, including an always-stub Email row', async () => {
    mockHealth([
      { name: 'MongoDB', status: 'ok', detail: 'Reachable.' },
      { name: 'Redis', status: 'error', detail: 'Unreachable or misconfigured.' },
      { name: 'Object storage (S3/MinIO)', status: 'ok', detail: 'Reachable.' },
      { name: 'Email', status: 'stub', detail: 'Logging-only stub.' },
    ])
    renderPage()

    expect(await screen.findByText('MongoDB')).toBeInTheDocument()
    expect(screen.getAllByText('Healthy')).toHaveLength(2)
    expect(screen.getByText('Unhealthy')).toBeInTheDocument()
    expect(screen.getByText('Not configured')).toBeInTheDocument()
  })

  it('shows a Pause button for Email/WhatsApp only, not for other integrations', async () => {
    mockHealth([
      { name: 'MongoDB', status: 'ok', detail: 'Reachable.' },
      { name: 'Email', status: 'stub', detail: 'Logging-only stub.', paused: false },
      { name: 'WhatsApp', status: 'stub', detail: 'Logging-only stub.', paused: false },
    ])
    renderPage()

    await screen.findByText('MongoDB')
    expect(screen.getAllByRole('button', { name: 'Pause' })).toHaveLength(2)
  })

  it('pauses a channel and shows Resume after a successful call', async () => {
    mockHealth([{ name: 'Email', status: 'stub', detail: 'Logging-only stub.', paused: false }])
    server.use(
      http.post(url('/platform/integrations/Email/pause'), () =>
        HttpResponse.json({
          success: true,
          data: [{ name: 'Email', status: 'stub', detail: 'Logging-only stub.', paused: true }],
        }),
      ),
    )
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Pause' }))

    expect(await screen.findByRole('button', { name: 'Resume' })).toBeInTheDocument()
  })

  it('re-fetches when Recheck is clicked', async () => {
    let requestCount = 0
    server.use(
      http.get(url('/platform/integrations/health'), () => {
        requestCount += 1
        return HttpResponse.json({
          success: true,
          data: [{ name: 'MongoDB', status: 'ok', detail: 'Reachable.' }],
        })
      }),
    )
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('MongoDB')
    expect(requestCount).toBe(1)

    await user.click(screen.getByRole('button', { name: /Recheck/ }))
    await waitFor(() => expect(requestCount).toBe(2))
  })
})
