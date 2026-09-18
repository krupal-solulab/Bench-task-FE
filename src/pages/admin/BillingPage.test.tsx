import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { BillingPage } from '@/pages/admin/BillingPage'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function mockUsers(total: number) {
  server.use(
    http.get(url('/users'), () =>
      HttpResponse.json({
        success: true,
        data: [],
        meta: {
          total,
          page: 1,
          limit: 1,
          totalPages: total,
          hasNextPage: total > 1,
          hasPrevPage: false,
        },
      }),
    ),
  )
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return render(<BillingPage />, { wrapper: Wrapper })
}

describe('BillingPage', () => {
  it('renders the real seat count and a placeholder plan/add-ons with a Contact sales link', async () => {
    mockUsers(7)
    renderPage()

    expect(await screen.findByText('7')).toBeInTheDocument()
    expect(screen.getByText('Team (placeholder)')).toBeInTheDocument()
    expect(screen.getByText('Advanced reporting')).toBeInTheDocument()
    const contactLink = screen.getByRole('link', { name: /Contact sales/ })
    expect(contactLink.getAttribute('href')).toMatch(/^mailto:/)
  })
})
