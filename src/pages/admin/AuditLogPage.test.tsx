import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { AuditLogPage } from '@/pages/admin/AuditLogPage'
import type { AuditLogEntry } from '@/types/audit-log.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function makeEntry(overrides: Partial<AuditLogEntry> = {}): AuditLogEntry {
  return {
    id: 'audit-1',
    organizationId: 'org-1',
    actor: { id: 'u-admin', name: 'Ada Admin', email: 'admin@example.com' },
    action: 'UserCreated',
    targetType: 'User',
    targetId: 'u-dev1',
    targetLabel: 'Dev One',
    metadata: { role: 'Developer' },
    createdAt: '2026-01-05T10:00:00.000Z',
    ...overrides,
  }
}

function mockAuditLog(entries: AuditLogEntry[], onRequest?: (url: URL) => void) {
  server.use(
    http.get(url('/audit-log'), ({ request }) => {
      onRequest?.(new URL(request.url))
      return HttpResponse.json({
        success: true,
        data: entries,
        meta: {
          total: entries.length,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      })
    }),
  )
}

function renderPage(initialEntry = '/admin/audit-log') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }
  return render(<AuditLogPage />, { wrapper: Wrapper })
}

describe('AuditLogPage', () => {
  it('renders fetched audit entries', async () => {
    mockAuditLog([makeEntry()])
    renderPage()

    await waitFor(() => expect(screen.getByText('User Created')).toBeInTheDocument())
    expect(screen.getByText('Ada Admin')).toBeInTheDocument()
    expect(screen.getByText('User: Dev One')).toBeInTheDocument()
    expect(screen.getByText('role: Developer')).toBeInTheDocument()
  })

  it('shows an empty state when there is no activity', async () => {
    mockAuditLog([])
    renderPage()

    expect(await screen.findByText('No audit log entries yet')).toBeInTheDocument()
  })

  it('forwards a filter already present in the URL as a query param to the API', async () => {
    // Opening the Radix Select popover and clicking an option hangs under jsdom, so this
    // exercises the same filters -> API-query wiring via useQueryParams reading the URL
    // directly, mirroring PlatformApiLogsPage's equivalent test.
    let capturedAction: string | null = null
    let capturedActor: string | null = null
    mockAuditLog([makeEntry()], (reqUrl) => {
      capturedAction = reqUrl.searchParams.get('action')
      capturedActor = reqUrl.searchParams.get('actorId')
    })
    renderPage('/admin/audit-log?action=UserCreated&actorId=u-admin')

    await waitFor(() => expect(screen.getByText('User Created')).toBeInTheDocument())
    expect(capturedAction).toBe('UserCreated')
    expect(capturedActor).toBe('u-admin')
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument()
  })

  it('changing a date filter resets to page 1 (regression: filters must not be discarded by the page-reset)', async () => {
    const seenDateFroms: Array<string | null> = []
    const seenPages: Array<string | null> = []
    mockAuditLog([makeEntry()], (reqUrl) => {
      seenDateFroms.push(reqUrl.searchParams.get('dateFrom'))
      seenPages.push(reqUrl.searchParams.get('page'))
    })
    // Start on page 2 so resetting to page 1 on filter change is actually observable.
    renderPage('/admin/audit-log?page=2')

    await waitFor(() => expect(screen.getByText('User Created')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-01-01' } })

    await waitFor(() => expect(seenDateFroms.at(-1)).toBe('2026-01-01'))
    expect(seenPages.at(-1)).toBe('1')
  })

  it('clearing filters removes them from subsequent requests', async () => {
    const seenActions: Array<string | null> = []
    mockAuditLog([makeEntry()], (reqUrl) => {
      seenActions.push(reqUrl.searchParams.get('action'))
    })
    const user = userEvent.setup()
    renderPage('/admin/audit-log?action=UserCreated')

    await waitFor(() => expect(screen.getByText('User Created')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))

    await waitFor(() => expect(seenActions.at(-1)).toBeNull())
  })

  it('shows an error state with a working retry', async () => {
    let attempt = 0
    server.use(
      http.get(url('/audit-log'), () => {
        attempt += 1
        if (attempt === 1) {
          return HttpResponse.json(
            { statusCode: 500, message: 'Server error', error: 'Error', timestamp: '', path: '' },
            { status: 500 },
          )
        }
        return HttpResponse.json({
          success: true,
          data: [],
          meta: {
            total: 0,
            page: 1,
            limit: 20,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        })
      }),
    )
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText('Server error')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(screen.getByText('No audit log entries yet')).toBeInTheDocument())
  })
})
