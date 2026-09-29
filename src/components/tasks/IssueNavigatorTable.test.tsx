import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { mockTasks } from '@/test/mocks/fixtures'
import { IssueNavigatorTable } from '@/components/tasks/IssueNavigatorTable'
import type { Task } from '@/types/task.types'

function renderTable(tasks: Task[] = mockTasks) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ToastProvider>{children}</ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
  return render(
    <IssueNavigatorTable tasks={tasks} isLoading={false} isError={false} onRetry={() => {}} />,
    { wrapper: Wrapper },
  )
}

describe('IssueNavigatorTable', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('renders every column header with a drag handle', () => {
    renderTable()
    for (const label of [
      'Title',
      'Type',
      'Project',
      'Status',
      'Priority',
      'Assignee',
      'Due date',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    expect(screen.getAllByLabelText(/Drag to reorder/)).toHaveLength(7)
  })

  it('renders a resize handle for every column', () => {
    renderTable()
    expect(screen.getAllByLabelText(/Resize .* column/)).toHaveLength(7)
  })

  it('shows an empty state when there are no matching tasks', () => {
    renderTable([])
    expect(screen.getByText('No matching issues')).toBeInTheDocument()
  })

  it('shows an error state with a retry button', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <ToastProvider>{children}</ToastProvider>
          </MemoryRouter>
        </QueryClientProvider>
      )
    }
    render(
      <IssueNavigatorTable
        tasks={[]}
        isLoading={false}
        isError
        errorMessage="boom"
        onRetry={() => {}}
      />,
      { wrapper: Wrapper },
    )
    expect(screen.getByText('boom')).toBeInTheDocument()
  })

  // Module 4 gap-closure: inline-edit. Mounting or opening a Radix Select reliably hangs the
  // whole Vitest worker in this codebase's jsdom setup (a documented, pre-existing limitation with
  // zero working precedent anywhere in this test suite - see WorkflowSettingsForm/
  // IssueTypesSettingsForm/RoadmapPage's own tests, none of which open a Select either, and it
  // held true here even for PriorityCell's Select, which has no async data dependency at all).
  // These tests stick to what a plain, no-click render can prove; the actual click-to-edit and
  // click-through-to-selection behavior is verified live instead, same as every other Select in
  // this app.
  describe('inline-edit', () => {
    it('renders the priority badge as a clickable button (edit-mode verified live)', () => {
      renderTable()
      const badge = screen.getByText('P1')
      expect(badge.closest('button')).toBeInTheDocument()
    })

    it('renders the assignee as a clickable button (edit-mode verified live)', () => {
      renderTable()
      const avatar = screen.getByTitle(mockTasks[0]!.assignee!.name)
      expect(avatar.closest('button')).toBeInTheDocument()
    })
  })

  it('persists the initial column layout to localStorage', () => {
    renderTable()
    const raw = window.localStorage.getItem('issue-navigator-columns-v1')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed.order).toEqual([
      'title',
      'issueType',
      'project',
      'status',
      'priority',
      'assignee',
      'dueDate',
    ])
  })
})
