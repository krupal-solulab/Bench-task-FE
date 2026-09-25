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
import { BacklogBoard } from '@/components/sprints/BacklogBoard'
import type { Task } from '@/types/task.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

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
    securityLevel: null,
    watcherIds: [],
    voterIds: [],
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
          <ToastProvider>
            {children}
            <ToastViewport />
          </ToastProvider>
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

  describe('Phase 2 gap-closure: grouping and bulk actions', () => {
    it('groups tasks by parent epic, with an "No epic" bucket for parentless tasks', async () => {
      const user = userEvent.setup()
      renderBoard([
        makeTask({
          id: 't-1',
          title: 'Epic A task',
          parent: { id: 'epic-a', title: 'Epic A', issueKey: 'PRJ-1' },
        }),
        makeTask({ id: 't-2', title: 'Loose task', parent: null }),
      ])

      await user.click(screen.getByLabelText('Group by epic'))

      expect(screen.getByRole('heading', { name: /Epic A/ })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /No epic/ })).toBeInTheDocument()
      expect(screen.getByText('Epic A task')).toBeInTheDocument()
      expect(screen.getByText('Loose task')).toBeInTheDocument()
      // Grouped mode disables drag-to-reorder.
      expect(screen.queryByLabelText('Drag to reorder')).not.toBeInTheDocument()
    })

    it('shows the bulk action bar once a row is selected, and clears it on "Clear selection"', async () => {
      const user = userEvent.setup()
      renderBoard([makeTask({ id: 't-1', title: 'First' })])

      expect(screen.queryByText('1 selected')).not.toBeInTheDocument()
      await user.click(screen.getByLabelText('Select First'))
      expect(screen.getByText('1 selected')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Clear selection' }))
      expect(screen.queryByText('1 selected')).not.toBeInTheDocument()
    })

    it('bulk-adds a label to every selected task via the action bar', async () => {
      let sentBody: { taskIds: string[]; labels: string[] } | null = null
      server.use(
        http.patch(url('/tasks/bulk-relabel'), async ({ request }) => {
          sentBody = (await request.json()) as typeof sentBody
          return HttpResponse.json({
            success: true,
            data: { succeeded: sentBody!.taskIds, failed: [] },
          })
        }),
      )
      const user = userEvent.setup()
      renderBoard([
        makeTask({ id: 't-1', title: 'First' }),
        makeTask({ id: 't-2', title: 'Second' }),
      ])

      await user.click(screen.getByLabelText('Select First'))
      await user.click(screen.getByLabelText('Select Second'))
      await user.type(screen.getByPlaceholderText('Add label(s)…'), 'urgent{Enter}')
      await user.click(screen.getByRole('button', { name: 'Apply' }))

      await waitFor(() => expect(sentBody).not.toBeNull())
      expect(sentBody!.taskIds.sort()).toEqual(['t-1', 't-2'])
      expect(sentBody!.labels).toEqual(['urgent'])
      expect(await screen.findByText('Add labels: 2 task(s) updated')).toBeInTheDocument()
    })

    it('does not show selection checkboxes or the bulk bar when canManage is false', () => {
      renderBoard([makeTask({ id: 't-1', title: 'First' })], false)
      expect(screen.queryByLabelText('Select First')).not.toBeInTheDocument()
    })
  })

  describe('Module 5: bulk status/priority/delete', () => {
    // Bulk "Set status"/"Set priority" use the same Radix Select as the existing "Move to
    // sprint" picker, which this file's own bulk-relabel test avoids opening (documented jsdom/
    // Radix limitation - see WorkflowCanvas.test.tsx for the same class of issue). Bulk-delete
    // is a plain Button + ConfirmDialog, so it's fully testable here.
    it('bulk-deletes every selected task via the action bar, after confirming', async () => {
      let sentBody: { taskIds: string[] } | null = null
      server.use(
        http.patch(url('/tasks/bulk-delete'), async ({ request }) => {
          sentBody = (await request.json()) as typeof sentBody
          return HttpResponse.json({
            success: true,
            data: { succeeded: sentBody!.taskIds, failed: [] },
          })
        }),
      )
      const user = userEvent.setup()
      renderBoard([
        makeTask({ id: 't-1', title: 'First' }),
        makeTask({ id: 't-2', title: 'Second' }),
      ])

      await user.click(screen.getByLabelText('Select First'))
      await user.click(screen.getByLabelText('Select Second'))
      await user.click(screen.getByRole('button', { name: 'Delete' }))
      // The toolbar's "Delete" button and the confirm dialog's "Delete" button coexist once the
      // dialog opens - the dialog's is the last one rendered.
      const confirmButtons = screen.getAllByRole('button', { name: 'Delete' })
      await user.click(confirmButtons[confirmButtons.length - 1]!)

      await waitFor(() => expect(sentBody).not.toBeNull())
      expect(sentBody!.taskIds.sort()).toEqual(['t-1', 't-2'])
      expect(await screen.findByText('Delete: 2 task(s) updated')).toBeInTheDocument()
    })

    it('reports a partial bulk-delete failure without crashing', async () => {
      server.use(
        http.patch(url('/tasks/bulk-delete'), () =>
          HttpResponse.json({
            success: true,
            data: { succeeded: ['t-1'], failed: [{ taskId: 't-2', message: 'Forbidden' }] },
          }),
        ),
      )
      const user = userEvent.setup()
      renderBoard([
        makeTask({ id: 't-1', title: 'First' }),
        makeTask({ id: 't-2', title: 'Second' }),
      ])

      await user.click(screen.getByLabelText('Select First'))
      await user.click(screen.getByLabelText('Select Second'))
      await user.click(screen.getByRole('button', { name: 'Delete' }))
      const confirmButtons = screen.getAllByRole('button', { name: 'Delete' })
      await user.click(confirmButtons[confirmButtons.length - 1]!)

      expect(await screen.findByText('Delete: 1 succeeded, 1 failed')).toBeInTheDocument()
    })
  })
})
