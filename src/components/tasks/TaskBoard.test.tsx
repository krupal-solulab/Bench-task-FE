import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { TaskBoard, type SwimlaneBy } from '@/components/tasks/TaskBoard'
import type { Task } from '@/types/task.types'
import type { Workflow } from '@/types/workflow.types'
import { NO_MEMBER_PERMISSIONS, type MemberPermissions } from '@/types/project.types'

function makeAuthValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: {
      id: 'u-1',
      name: 'Ada Admin',
      email: 'a@a.com',
      role: 'Admin',
      isActive: true,
      organizationId: 'org-1',
      createdAt: '',
      updatedAt: '',
    },
    isAuthenticated: true,
    isLoading: false,
    login: async () => {},
    registerOrganization: async () => {},
    logout: async () => {},
    hasRole: () => true,
    ...overrides,
  }
}

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
    labels: [],
    components: [],
    fixVersions: [],
    affectsVersions: [],
    originalEstimateHours: null,
    customFieldValues: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderBoard(
  tasks: Task[],
  workflow?: Workflow,
  authOverrides: Partial<AuthContextValue> = {},
  grant?: MemberPermissions | null,
  swimlaneBy?: SwimlaneBy,
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ToastProvider>
            <AuthContext.Provider value={makeAuthValue(authOverrides)}>
              {children}
            </AuthContext.Provider>
          </ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
  return render(
    <TaskBoard tasks={tasks} workflow={workflow} grant={grant} swimlaneBy={swimlaneBy} />,
    { wrapper: Wrapper },
  )
}

describe('TaskBoard', () => {
  it('renders the 4 system default columns, in order, when no workflow is given (regression)', () => {
    renderBoard([makeTask({ status: 'Todo', statusCategory: 'To Do' })])

    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(headings).toEqual(['Todo', 'In Progress', 'Review', 'Done'])
  })

  it('places each task under its matching default column', () => {
    renderBoard([
      makeTask({ id: 't-todo', title: 'Todo task', status: 'Todo', statusCategory: 'To Do' }),
      makeTask({ id: 't-done', title: 'Done task', status: 'Done', statusCategory: 'Done' }),
    ])

    expect(screen.getByText('Todo task')).toBeInTheDocument()
    expect(screen.getByText('Done task')).toBeInTheDocument()
  })

  it("renders a custom workflow's columns instead of the default 4", () => {
    const customWorkflow: Workflow = {
      statuses: [
        { name: 'Backlog', category: 'To Do' },
        { name: 'Building', category: 'In Progress' },
        { name: 'Shipped', category: 'Done' },
      ],
      transitions: [],
      initialStatus: 'Backlog',
    }
    renderBoard(
      [makeTask({ title: 'A shipped task', status: 'Shipped', statusCategory: 'Done' })],
      customWorkflow,
    )

    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(headings).toEqual(['Backlog', 'Building', 'Shipped'])
    expect(screen.queryByText('Todo')).not.toBeInTheDocument()
    expect(screen.getByText('A shipped task')).toBeInTheDocument()
  })

  it('shows a per-column task count', () => {
    const customWorkflow: Workflow = {
      statuses: [
        { name: 'Backlog', category: 'To Do' },
        { name: 'Shipped', category: 'Done' },
      ],
      transitions: [],
      initialStatus: 'Backlog',
    }
    renderBoard(
      [
        makeTask({ id: 't-1', status: 'Backlog', statusCategory: 'To Do' }),
        makeTask({ id: 't-2', status: 'Backlog', statusCategory: 'To Do' }),
      ],
      customWorkflow,
    )

    const backlogHeading = screen.getByRole('heading', { name: 'Backlog' })
    const columnHeader = backlogHeading.parentElement!
    expect(within(columnHeader).getByText('2')).toBeInTheDocument()
  })

  it('shows a WIP limit warning when a column exceeds its limit (Phase 2 gap-closure)', () => {
    const customWorkflow: Workflow = {
      statuses: [
        { name: 'Backlog', category: 'To Do' },
        { name: 'Building', category: 'In Progress', wipLimit: 1 },
      ],
      transitions: [],
      initialStatus: 'Backlog',
    }
    renderBoard(
      [
        makeTask({ id: 't-1', status: 'Building', statusCategory: 'In Progress' }),
        makeTask({ id: 't-2', status: 'Building', statusCategory: 'In Progress' }),
      ],
      customWorkflow,
    )

    expect(screen.getByText('2 / 1')).toBeInTheDocument()
    expect(screen.getByText('WIP limit exceeded for this column')).toBeInTheDocument()
  })

  it('does not warn when a column is at or under its WIP limit (Phase 2 gap-closure)', () => {
    const customWorkflow: Workflow = {
      statuses: [{ name: 'Building', category: 'In Progress', wipLimit: 2 }],
      transitions: [],
      initialStatus: 'Building',
    }
    renderBoard(
      [
        makeTask({ id: 't-1', status: 'Building', statusCategory: 'In Progress' }),
        makeTask({ id: 't-2', status: 'Building', statusCategory: 'In Progress' }),
      ],
      customWorkflow,
    )

    expect(screen.getByText('2 / 2')).toBeInTheDocument()
    expect(screen.queryByText('WIP limit exceeded for this column')).not.toBeInTheDocument()
  })

  it('groups tasks into swimlanes by assignee, keeping the same columns per lane (Phase 2 gap-closure)', () => {
    const customWorkflow: Workflow = {
      statuses: [{ name: 'Todo', category: 'To Do' }],
      transitions: [],
      initialStatus: 'Todo',
    }
    renderBoard(
      [
        makeTask({
          id: 't-1',
          title: 'Alice task',
          status: 'Todo',
          assignee: { ...makeAuthValue().user!, id: 'alice', name: 'Alice' },
        }),
        makeTask({ id: 't-2', title: 'Unassigned task', status: 'Todo', assignee: null }),
      ],
      customWorkflow,
      {},
      undefined,
      'assignee',
    )

    expect(screen.getByRole('heading', { name: /Alice/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Unassigned/ })).toBeInTheDocument()
    expect(screen.getByText('Alice task')).toBeInTheDocument()
    expect(screen.getByText('Unassigned task')).toBeInTheDocument()
  })

  describe('per-project grants (Phase 3)', () => {
    const devAuth: Partial<AuthContextValue> = {
      user: {
        id: 'dev-1',
        name: 'Dev One',
        email: 'dev@a.com',
        role: 'Developer',
        isActive: true,
        organizationId: 'org-1',
        createdAt: '',
        updatedAt: '',
      },
      hasRole: () => false,
    }
    const unassignedTask = makeTask({
      status: 'Todo',
      statusCategory: 'To Do',
      assignee: { ...devAuth.user!, id: 'someone-else' },
    })

    it('shows a read-only badge (no status control) for a non-assigned Developer with no grant', () => {
      renderBoard([unassignedTask], undefined, devAuth, null)
      expect(screen.queryByRole('combobox', { name: 'Change task status' })).not.toBeInTheDocument()
    })

    it('enables the status control for a non-assigned Developer with a canChangeAnyTaskStatus grant', () => {
      renderBoard([unassignedTask], undefined, devAuth, {
        ...NO_MEMBER_PERMISSIONS,
        canChangeAnyTaskStatus: true,
      })
      expect(screen.getByRole('combobox', { name: 'Change task status' })).toBeInTheDocument()
    })
  })
})
