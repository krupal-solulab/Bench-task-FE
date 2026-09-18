import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { PlatformBillingPage } from '@/pages/platform/PlatformBillingPage'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function mockStats(organizationCount: number, totalUserCount: number) {
  server.use(
    http.get(url('/platform/stats'), () =>
      HttpResponse.json({ success: true, data: { organizationCount, totalUserCount } }),
    ),
  )
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return render(<PlatformBillingPage />, { wrapper: Wrapper })
}

describe('PlatformBillingPage', () => {
  it('renders real organization/seat counts and a clearly-labeled estimated MRR', async () => {
    mockStats(4, 25)
    renderPage()

    expect(await screen.findByText('4')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByText('$300')).toBeInTheDocument()
    expect(screen.getByText(/Estimated, for illustration only/)).toBeInTheDocument()
  })
})
