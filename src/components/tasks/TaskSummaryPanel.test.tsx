import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { TaskSummaryPanel } from './TaskSummaryPanel'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return render(<TaskSummaryPanel taskId="t-1" />, { wrapper: Wrapper })
}

describe('TaskSummaryPanel', () => {
  it('is collapsed by default and fetches nothing until expanded (regression)', () => {
    let requested = false
    server.use(
      http.get(url('/tasks/t-1/summary'), () => {
        requested = true
        return HttpResponse.json({
          success: true,
          data: { headline: 'never seen', bullets: [], generatedAt: '2026-01-01T00:00:00.000Z' },
        })
      }),
    )
    renderPanel()

    expect(screen.getByText('Suggested summary')).toBeInTheDocument()
    expect(screen.queryByText('never seen')).not.toBeInTheDocument()
    expect(requested).toBe(false)
  })

  it('fetches and renders the headline and bullets once expanded', async () => {
    server.use(
      http.get(url('/tasks/t-1/summary'), () =>
        HttpResponse.json({
          success: true,
          data: {
            headline: '"Ship it" has been open for 9 days.',
            bullets: ['Currently "In Progress". Priority: P2.', 'Unassigned.'],
            generatedAt: '2026-01-01T00:00:00.000Z',
          },
        }),
      ),
    )
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByText('Suggested summary'))

    expect(await screen.findByText('"Ship it" has been open for 9 days.')).toBeInTheDocument()
    expect(screen.getByText('Unassigned.')).toBeInTheDocument()
    expect(screen.getByText(/not AI-generated/)).toBeInTheDocument()
  })

  it('shows an error state with a working retry', async () => {
    let attempt = 0
    server.use(
      http.get(url('/tasks/t-1/summary'), () => {
        attempt += 1
        if (attempt === 1) {
          return HttpResponse.json(
            { statusCode: 500, message: 'Server error', error: 'Error', timestamp: '', path: '' },
            { status: 500 },
          )
        }
        return HttpResponse.json({
          success: true,
          data: { headline: 'Recovered', bullets: [], generatedAt: '2026-01-01T00:00:00.000Z' },
        })
      }),
    )
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByText('Suggested summary'))
    expect(await screen.findByText('Server error')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Recovered')).toBeInTheDocument()
  })
})
