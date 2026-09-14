import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { SprintLifecycleControls } from '@/components/sprints/SprintLifecycleControls'
import type { Sprint } from '@/types/sprint.types'

function makeSprint(overrides: Partial<Sprint> = {}): Sprint {
  return {
    id: 's-1',
    name: 'Sprint 1',
    goal: '',
    project: 'p-1',
    status: 'Planned',
    startDate: '2026-01-01',
    endDate: '2026-01-14',
    startedAt: null,
    completedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderControls(sprint: Sprint, canManage: boolean) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    )
  }
  return render(
    <SprintLifecycleControls
      sprint={sprint}
      projectId="p-1"
      canManage={canManage}
      onEdit={() => {}}
    />,
    { wrapper: Wrapper },
  )
}

describe('SprintLifecycleControls', () => {
  it('shows Start (and hides Complete) for a Planned sprint when canManage', () => {
    renderControls(makeSprint({ status: 'Planned' }), true)
    expect(screen.getByRole('button', { name: 'Start sprint' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Complete sprint' })).not.toBeInTheDocument()
  })

  it('shows Complete (and hides Start) for an Active sprint when canManage', () => {
    renderControls(makeSprint({ status: 'Active' }), true)
    expect(screen.getByRole('button', { name: 'Complete sprint' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start sprint' })).not.toBeInTheDocument()
  })

  it('shows no action buttons for a Completed sprint', () => {
    renderControls(makeSprint({ status: 'Completed' }), true)
    expect(screen.queryByRole('button', { name: 'Start sprint' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Complete sprint' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('hides every action button when canManage is false', () => {
    renderControls(makeSprint({ status: 'Planned' }), false)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText('Planned')).toBeInTheDocument()
  })
})
