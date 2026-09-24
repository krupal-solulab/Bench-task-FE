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
import { ReleasesPanel } from '@/components/releases/ReleasesPanel'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function paginated<T>(data: T[]) {
  return {
    success: true,
    data,
    meta: {
      total: data.length,
      page: 1,
      limit: 100,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
  }
}

function mockReleases(releases: Array<Record<string, unknown>>) {
  server.use(http.get(url('/projects/p-1/releases'), () => HttpResponse.json(paginated(releases))))
}

function mockProgress(releaseId: string, progress: Record<string, unknown>) {
  server.use(
    http.get(url(`/projects/p-1/releases/${releaseId}/progress`), () =>
      HttpResponse.json({ success: true, data: progress }),
    ),
  )
}

function renderPanel(canManage = true) {
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
  return render(<ReleasesPanel projectId="p-1" canManage={canManage} />, { wrapper: Wrapper })
}

const BASE_RELEASE = {
  id: 'r-1',
  name: 'v1.0.0',
  description: 'First cut',
  project: 'p-1',
  status: 'Unreleased',
  releaseDate: null,
  releasedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('ReleasesPanel', () => {
  it('shows an empty state when there are no releases yet', async () => {
    mockReleases([])
    renderPanel()

    expect(await screen.findByText('No releases yet')).toBeInTheDocument()
  })

  it('lists an existing release with its progress', async () => {
    mockReleases([BASE_RELEASE])
    mockProgress('r-1', { releaseId: 'r-1', totalIssues: 4, doneIssues: 1, progress: 25 })
    renderPanel()

    expect(await screen.findByText('v1.0.0')).toBeInTheDocument()
    expect(screen.getByText('First cut')).toBeInTheDocument()
    expect(await screen.findByText('1/4 issues done')).toBeInTheDocument()
  })

  it('hides "New release" when canManage is false', async () => {
    mockReleases([])
    renderPanel(false)

    await screen.findByText('No releases yet')
    expect(screen.queryByRole('button', { name: /New release/ })).not.toBeInTheDocument()
  })

  it('creates a new release via the modal form', async () => {
    mockReleases([])
    let createdBody: Record<string, unknown> | null = null
    server.use(
      http.post(url('/projects/p-1/releases'), async ({ request }) => {
        createdBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          { success: true, data: { ...BASE_RELEASE, name: createdBody.name } },
          { status: 201 },
        )
      }),
    )
    const user = userEvent.setup()
    renderPanel()

    await screen.findByText('No releases yet')
    // Two "New release" buttons render when the list is empty - the toolbar's and the empty
    // state's own call-to-action - both open the same create modal, so either one is fine to use.
    await user.click(screen.getAllByRole('button', { name: /New release/ })[0]!)
    await user.type(screen.getByLabelText('Name', { exact: false }), 'v3.0.0')
    await user.click(screen.getByRole('button', { name: 'Create release' }))

    await waitFor(() => expect(createdBody).not.toBeNull())
    expect(createdBody).toMatchObject({ name: 'v3.0.0' })
    expect(await screen.findByText('Release created')).toBeInTheDocument()
  })

  it('opens the release notes modal and shows the generated markdown', async () => {
    mockReleases([BASE_RELEASE])
    mockProgress('r-1', { releaseId: 'r-1', totalIssues: 0, doneIssues: 0, progress: 0 })
    server.use(
      http.get(url('/projects/p-1/releases/r-1/release-notes'), () =>
        HttpResponse.json({
          success: true,
          data: {
            releaseId: 'r-1',
            releaseName: 'v1.0.0',
            issueCount: 1,
            markdown: '# v1.0.0\n\n## Bug\n\n- **PRJ-1** Fixed the thing',
            generatedAt: '2026-01-01T00:00:00.000Z',
          },
        }),
      ),
    )
    const user = userEvent.setup()
    renderPanel()

    await user.click(await screen.findByRole('button', { name: /Release notes/ }))

    expect(await screen.findByText(/Fixed the thing/)).toBeInTheDocument()
  })
})
