import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { server } from '@/test/mocks/server'
import { NotificationBell } from './NotificationBell'

// NOTE: this codebase's Radix-based dropdowns (Select, DropdownMenu) reliably hang under
// userEvent-driven "open the popover, then interact with its content" flows in this
// jsdom + vitest environment (confirmed here with a minimal repro against the bare
// DropdownMenu primitive itself, independent of anything in NotificationBell) - the same
// constraint every other Radix-consuming component test in this codebase (SavedFiltersMenu,
// TaskFilters) already works around by never click-opening a Select/DropdownMenu in a test.
// Coverage here is therefore limited to what's observable without opening the trigger: the
// unread badge, driven directly by the `unread-count` query.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function mockDefaults({
  unreadCount = 0,
  notifications = [] as Array<Record<string, unknown>>,
  mutedTypes = [] as string[],
} = {}) {
  server.use(
    http.get(url('/notifications/unread-count'), () =>
      HttpResponse.json({ success: true, data: { count: unreadCount } }),
    ),
    http.get(url('/notifications'), () =>
      HttpResponse.json({
        success: true,
        data: notifications,
        meta: {
          total: notifications.length,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      }),
    ),
    http.get(url('/notifications/preferences'), () =>
      HttpResponse.json({ success: true, data: { mutedTypes } }),
    ),
  )
}

function renderBell() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ToastProvider>
            {children}
            <ToastViewport />
          </ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
  return render(<NotificationBell />, { wrapper: Wrapper })
}

describe('NotificationBell', () => {
  it('shows no badge when there are zero unread notifications (regression)', async () => {
    mockDefaults()
    renderBell()
    const trigger = await screen.findByRole('button', { name: 'Notifications' })
    expect(within(trigger).queryByText(/\d/)).not.toBeInTheDocument()
  })

  it('shows the unread count badge', async () => {
    mockDefaults({ unreadCount: 3 })
    renderBell()
    const trigger = await screen.findByRole('button', { name: 'Notifications' })
    expect(await within(trigger).findByText('3')).toBeInTheDocument()
  })

  it('caps the badge at "99+" for large unread counts', async () => {
    mockDefaults({ unreadCount: 150 })
    renderBell()
    const trigger = await screen.findByRole('button', { name: 'Notifications' })
    expect(await within(trigger).findByText('99+')).toBeInTheDocument()
  })
})
