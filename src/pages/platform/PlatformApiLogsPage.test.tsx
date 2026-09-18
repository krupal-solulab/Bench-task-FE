import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { PlatformApiLogsPage } from '@/pages/platform/PlatformApiLogsPage'
import type { ApiLogEntry } from '@/types/api-log.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function makeLog(overrides: Partial<ApiLogEntry> = {}): ApiLogEntry {
  return {
    id: 'log-1',
    method: 'GET',
    path: '/api/v1/projects',
    statusCode: 200,
    organization: { id: 'org-1', name: 'Acme Inc', slug: 'acme' },
    userId: 'u-1',
    userEmail: 'admin@example.com',
    durationMs: 42,
    ip: '127.0.0.1',
    userAgent: 'jest',
    errorMessage: null,
    createdAt: '2026-01-05T10:00:00.000Z',
    ...overrides,
  }
}

function mockOrganizations() {
  server.use(
    http.get(url('/platform/organizations'), () =>
      HttpResponse.json({
        success: true,
        data: [
          {
            id: 'org-1',
            name: 'Acme Inc',
            slug: 'acme',
            status: 'Active',
            userCount: 3,
            createdAt: '',
            updatedAt: '',
          },
        ],
        meta: {
          total: 1,
          page: 1,
          limit: 100,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      }),
    ),
  )
}

function mockLogs(logs: ApiLogEntry[], onRequest?: (url: URL) => void) {
  server.use(
    http.get(url('/platform/logs'), ({ request }) => {
      onRequest?.(new URL(request.url))
      return HttpResponse.json({
        success: true,
        data: logs,
        meta: {
          total: logs.length,
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

function renderPage(initialEntry = '/platform/logs') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }
  return render(<PlatformApiLogsPage />, { wrapper: Wrapper })
}

describe('PlatformApiLogsPage', () => {
  it('renders fetched log entries', async () => {
    mockOrganizations()
    mockLogs([makeLog()])
    renderPage()

    await waitFor(() => expect(screen.getByText('/api/v1/projects')).toBeInTheDocument())
    expect(screen.getByText('200')).toBeInTheDocument()
    expect(screen.getByText('Acme Inc')).toBeInTheDocument()
    expect(screen.getByText('admin@example.com')).toBeInTheDocument()
  })

  it('shows an empty state when there is no activity', async () => {
    mockOrganizations()
    mockLogs([])
    renderPage()

    expect(await screen.findByText('No API activity yet')).toBeInTheDocument()
  })

  it('forwards a filter already present in the URL as a query param to the API', async () => {
    // Opening the Radix Select popover and clicking an option hangs under jsdom (no
    // ResizeObserver/layout support), so this exercises the same filters -> API-query wiring
    // via useQueryParams reading the URL directly, which is how the Select's onValueChange
    // updates state in the first place.
    mockOrganizations()
    let capturedMethod: string | null = null
    let capturedOrg: string | null = null
    mockLogs([makeLog()], (reqUrl) => {
      capturedMethod = reqUrl.searchParams.get('method')
      capturedOrg = reqUrl.searchParams.get('organizationId')
    })
    renderPage('/platform/logs?method=POST&organizationId=org-1')

    await waitFor(() => expect(screen.getByText('/api/v1/projects')).toBeInTheDocument())
    expect(capturedMethod).toBe('POST')
    expect(capturedOrg).toBe('org-1')
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument()
  })

  it('typing in the path filter sends it as a query param and resets to page 1 (regression: filters must not be discarded by the page-reset)', async () => {
    mockOrganizations()
    const seenPaths: Array<string | null> = []
    const seenPages: Array<string | null> = []
    mockLogs([makeLog()], (reqUrl) => {
      seenPaths.push(reqUrl.searchParams.get('path'))
      seenPages.push(reqUrl.searchParams.get('page'))
    })
    const user = userEvent.setup()
    // Start on page 2 so resetting to page 1 on filter change is actually observable.
    renderPage('/platform/logs?page=2')

    await waitFor(() => expect(screen.getByText('/api/v1/projects')).toBeInTheDocument())
    await user.type(screen.getByPlaceholderText('Search path…'), 'dashboard')

    await waitFor(() => expect(seenPaths.at(-1)).toBe('dashboard'))
    expect(seenPages.at(-1)).toBe('1')
  })

  it('shows an error state with a working retry', async () => {
    mockOrganizations()
    let attempt = 0
    server.use(
      http.get(url('/platform/logs'), () => {
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
    await waitFor(() => expect(screen.getByText('No API activity yet')).toBeInTheDocument())
  })

  it('opens a detail modal with the redacted request/response body on row click (Role-surface polish)', async () => {
    mockOrganizations()
    mockLogs([makeLog()])
    server.use(
      http.get(url('/platform/logs/log-1'), () =>
        HttpResponse.json({
          success: true,
          data: makeLog({
            requestBody: { email: 'a@a.com', password: '[REDACTED]' },
            responseBody: { accessToken: '[REDACTED]' },
          }),
        }),
      ),
    )
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => expect(screen.getByText('/api/v1/projects')).toBeInTheDocument())
    await user.click(screen.getByText('/api/v1/projects'))

    expect(await screen.findByText('API log entry')).toBeInTheDocument()
    expect(screen.getByText(/"password": "\[REDACTED\]"/)).toBeInTheDocument()
    expect(screen.getByText(/"accessToken": "\[REDACTED\]"/)).toBeInTheDocument()
  })
})
