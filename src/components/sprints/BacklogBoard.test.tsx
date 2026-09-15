import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { BacklogBoard } from '@/components/sprints/BacklogBoard'
import type { Task } from '@/types/task.types'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't-1',
    title: 'A task',
    description: '',
    project: { id: 'p-1', name: 'A project' },
    assignee: null,
    status: 'Todo',
    statusCategory: 'To Do',
    priority: 'P2',
    dueDate: null,
    createdBy: {
      id: 'u-1',
      name: 'Creator',
      email: 'c@a.com',
      role: 'Admin',
      isActive: true,
      organizationId: 'org-1',
      createdAt: '',
      updatedAt: '',
    },
    sprint: null,
    rank: 1024,
    issueType: 'Task',
    parent: null,
    storyPoints: null,
    issueKey: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderBoard(tasks: Task[], canManage = true) {
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
  return render(<BacklogBoard tasks={tasks} canManage={canManage} assignableSprints={[]} />, {
    wrapper: Wrapper,
  })
}

describe('BacklogBoard', () => {
  it('renders tasks in the given (rank) order', () => {
    renderBoard([
      makeTask({ id: 't-1', title: 'First', rank: 1024 }),
      makeTask({ id: 't-2', title: 'Second', rank: 2048 }),
      makeTask({ id: 't-3', title: 'Third', rank: 3072 }),
    ])

    const titles = screen.getAllByRole('link').map((el) => el.textContent)
    expect(titles).toEqual(['First', 'Second', 'Third'])
  })

  it('shows a drag handle when canManage is true', () => {
    renderBoard([makeTask()], true)
    expect(screen.getByLabelText('Drag to reorder')).toBeInTheDocument()
  })

  it('hides the drag handle when canManage is false', () => {
    renderBoard([makeTask()], false)
    expect(screen.queryByLabelText('Drag to reorder')).not.toBeInTheDocument()
  })

  it('shows an empty state when there are no backlog tasks', () => {
    renderBoard([])
    expect(screen.getByText('Backlog is empty')).toBeInTheDocument()
  })
})
