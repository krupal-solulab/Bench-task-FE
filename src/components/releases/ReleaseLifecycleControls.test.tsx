import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { server } from '@/test/mocks/server'
import { ReleaseLifecycleControls } from '@/components/releases/ReleaseLifecycleControls'
import type { Release } from '@/types/release.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function makeRelease(overrides: Partial<Release> = {}): Release {
  return {
    id: 'r-1',
    name: 'v1.0.0',
    description: '',
    project: 'p-1',
    status: 'Unreleased',
    releaseDate: null,
    releasedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderControls(release: Release, canManage: boolean) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    )
  }
  return render(
    <ReleaseLifecycleControls
      release={release}
      projectId="p-1"
      canManage={canManage}
      onEdit={() => {}}
    />,
    { wrapper: Wrapper },
  )
}

describe('ReleaseLifecycleControls', () => {
  it('shows Release (and not Unrelease) for an Unreleased release when canManage', () => {
    renderControls(makeRelease({ status: 'Unreleased' }), true)
    expect(screen.getByRole('button', { name: 'Release' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Unrelease' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument()
  })

  it('shows Unrelease (and not Release) for a Released release when canManage', () => {
    renderControls(makeRelease({ status: 'Released' }), true)
    expect(screen.getByRole('button', { name: 'Unrelease' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Release' })).not.toBeInTheDocument()
  })

  it('shows only Delete for an Archived release (terminal)', () => {
    renderControls(makeRelease({ status: 'Archived' }), true)
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Release' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('hides every action button except the status badge when canManage is false', () => {
    renderControls(makeRelease({ status: 'Unreleased' }), false)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText('Unreleased')).toBeInTheDocument()
  })

  it('calls the release action endpoint when Release is clicked', async () => {
    let called = false
    server.use(
      http.post(url('/projects/p-1/releases/r-1/release'), () => {
        called = true
        return HttpResponse.json({ success: true, data: makeRelease({ status: 'Released' }) })
      }),
    )
    const user = userEvent.setup()
    renderControls(makeRelease({ status: 'Unreleased' }), true)

    await user.click(screen.getByRole('button', { name: 'Release' }))

    await waitFor(() => expect(called).toBe(true))
  })
})
