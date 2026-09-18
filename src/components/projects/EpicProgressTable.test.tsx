import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { EpicProgressTable } from './EpicProgressTable'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function renderTable() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }
  return render(<EpicProgressTable projectId="p-1" />, { wrapper: Wrapper })
}

describe('EpicProgressTable', () => {
  it('shows an empty state when the project has no epics (regression)', async () => {
    server.use(
      http.get(url('/projects/p-1/reports/epic-progress'), () =>
        HttpResponse.json({ success: true, data: [] }),
      ),
    )
    renderTable()

    expect(await screen.findByText('No epics yet')).toBeInTheDocument()
  })

  it('lists each epic with its completion percentage', async () => {
    server.use(
      http.get(url('/projects/p-1/reports/epic-progress'), () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              epicId: 'e-1',
              issueKey: 'PRJ-1',
              title: 'Fully done epic',
              linkedIssueCount: 2,
              doneCount: 2,
              progress: 100,
            },
            {
              epicId: 'e-2',
              issueKey: 'PRJ-2',
              title: 'Half done epic',
              linkedIssueCount: 4,
              doneCount: 2,
              progress: 50,
            },
          ],
        }),
      ),
    )
    renderTable()

    expect(await screen.findByText('Fully done epic')).toBeInTheDocument()
    expect(screen.getByText('2/2 (100%)')).toBeInTheDocument()
    expect(screen.getByText('Half done epic')).toBeInTheDocument()
    expect(screen.getByText('2/4 (50%)')).toBeInTheDocument()
  })

  it('shows an error state when the request fails', async () => {
    server.use(
      http.get(url('/projects/p-1/reports/epic-progress'), () =>
        HttpResponse.json({ success: false, message: 'boom' }, { status: 500 }),
      ),
    )
    renderTable()

    expect(await screen.findByText('boom')).toBeInTheDocument()
  })
})
