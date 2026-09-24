import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { server } from '@/test/mocks/server'
import { ReleaseMultiSelect } from '@/components/releases/ReleaseMultiSelect'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function mockReleases() {
  server.use(
    http.get(url('/projects/p-1/releases'), () =>
      HttpResponse.json({
        success: true,
        data: [
          { id: 'r-1', name: 'v1.0.0', description: '', status: 'Unreleased' },
          { id: 'r-2', name: 'v2.0.0', description: '', status: 'Released' },
        ],
        meta: {
          total: 2,
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

function renderSelect(value: string[] = [], onChange = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  render(
    <ReleaseMultiSelect projectId="p-1" value={value} onChange={onChange} placeholder="Pick" />,
    { wrapper: Wrapper },
  )
  return { onChange }
}

describe('ReleaseMultiSelect', () => {
  it('shows the placeholder when nothing is selected', async () => {
    mockReleases()
    renderSelect()
    expect(await screen.findByText('Pick')).toBeInTheDocument()
  })

  it('shows selected release names on the trigger', async () => {
    mockReleases()
    renderSelect(['r-1'])
    expect(await screen.findByText('v1.0.0')).toBeInTheDocument()
  })

  // Actually opening the Radix Popover (let alone clicking a Checkbox inside it) hangs the jsdom
  // test worker - Radix's floating-ui positioning needs real layout measurement jsdom can't
  // provide, the same documented limitation class as WorkflowCanvas's drag/connect gestures and
  // CommentForm's Radix Select picker. The add/remove logic itself lives in
  // lib/release-multi-select.ts specifically so it stays directly unit-testable (see
  // lib/release-multi-select.test.ts) without driving that interaction; live smoke testing covers
  // the real open-and-click path.
})
