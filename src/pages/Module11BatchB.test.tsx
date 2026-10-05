import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { server } from '@/test/mocks/server'
import { SnoozeNotificationsControl } from '@/components/tasks/SnoozeNotificationsControl'
import { ActivityPage } from '@/pages/ActivityPage'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function wrapper(initialEntry = '/') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <ToastProvider>
            {children}
            <ToastViewport />
          </ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}

describe('Snooze notifications control (Module 11 gap-closure)', () => {
  // Per this repo's convention (see NotificationBell.test.tsx), a Radix DropdownMenu is never
  // opened in jsdom - picking a duration is covered by the live-browser check instead.
  it('offers "Snooze notifications" while not snoozed', async () => {
    render(<SnoozeNotificationsControl taskId="t-1" />, { wrapper: wrapper() })
    expect(await screen.findByRole('button', { name: /Snooze notifications/ })).toBeInTheDocument()
  })

  it('shows "snoozed until" for an active snooze, and Resume ends it via DELETE', async () => {
    let snoozes = [{ id: 's-1', taskId: 't-1', until: '2026-10-06T09:00:00.000Z' }]
    let deleted = false
    server.use(
      http.get(url('/notifications/snoozes'), () =>
        HttpResponse.json({ success: true, data: snoozes }),
      ),
      http.delete(url('/notifications/snoozes/t-1'), () => {
        deleted = true
        snoozes = []
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    render(<SnoozeNotificationsControl taskId="t-1" />, { wrapper: wrapper() })

    expect(await screen.findByText(/Notifications snoozed until/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Resume' }))
    await waitFor(() => expect(deleted).toBe(true))
    expect(await screen.findByText('Notifications resumed')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Snooze notifications/ })).toBeInTheDocument()
  })
})

describe('Activity page (Module 11 gap-closure)', () => {
  it('lists entries in plain language with issue links, and loads more', async () => {
    let calls = 0
    server.use(
      http.get(url('/tasks/activity-feed'), ({ request }) => {
        calls += 1
        const before = new URL(request.url).searchParams.get('before')
        const entry = (id: string, title: string) => ({
          id,
          action: 'status_changed',
          from: 'Todo',
          to: 'In Progress',
          createdAt: new Date().toISOString(),
          actor: { id: 'u-1', name: 'Ada Admin' },
          task: { id: `t-${id}`, issueKey: `WEB-${id}`, title },
        })
        return HttpResponse.json({
          success: true,
          data: before
            ? { entries: [entry('2', 'Second page item')], nextBefore: null }
            : { entries: [entry('1', 'First page item')], nextBefore: '2026-10-01T00:00:00.000Z' },
        })
      }),
    )
    const user = userEvent.setup()
    render(<ActivityPage />, { wrapper: wrapper('/activity') })

    expect(await screen.findByRole('link', { name: 'WEB-1 First page item' })).toHaveAttribute(
      'href',
      '/tasks/t-1',
    )
    expect(screen.getByText(/moved from Todo to In Progress/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Load more' }))
    expect(await screen.findByText('Second page item', { exact: false })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
    expect(calls).toBe(2)
  })

  it('asks for "involved" entries when the filter is ticked', async () => {
    const scopes: string[] = []
    server.use(
      http.get(url('/tasks/activity-feed'), ({ request }) => {
        scopes.push(new URL(request.url).searchParams.get('scope') ?? '')
        return HttpResponse.json({ success: true, data: { entries: [], nextBefore: null } })
      }),
    )
    const user = userEvent.setup()
    render(<ActivityPage />, { wrapper: wrapper('/activity') })
    await screen.findByText('No activity yet')
    await user.click(screen.getByRole('checkbox', { name: "Only issues I'm involved in" }))
    await waitFor(() => expect(scopes).toContain('involved'))
  })
})
