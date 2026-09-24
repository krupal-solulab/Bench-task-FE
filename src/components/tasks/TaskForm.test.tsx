import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { TaskForm } from '@/components/tasks/TaskForm'

function renderTaskForm(props: Partial<Parameters<typeof TaskForm>[0]> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  const onCancel = vi.fn()
  render(<TaskForm projectId="p-1" onSubmit={onSubmit} onCancel={onCancel} {...props} />, {
    wrapper: Wrapper,
  })
  return { onSubmit, onCancel }
}

describe('TaskForm', () => {
  it('rejects a title shorter than 3 characters', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderTaskForm()

    await user.type(screen.getByLabelText('Title', { exact: false }), 'ab')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Title must be at least 3 characters')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits with a valid title, the given projectId, and the default P2 priority', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderTaskForm()

    await user.type(screen.getByLabelText('Title', { exact: false }), 'Ship the feature')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0]![0]).toEqual(
      expect.objectContaining({ title: 'Ship the feature', project: 'p-1', priority: 'P2' }),
    )
  })

  it('pre-fills the title from initialValues when editing', () => {
    renderTaskForm({
      submitLabel: 'Update',
      initialValues: {
        id: 't-1',
        title: 'Existing Task',
        description: 'desc',
        project: { id: 'p-1', name: 'Project' },
        assignee: null,
        status: 'Todo',
        statusCategory: 'To Do',
        priority: 'P1',
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
      },
    })

    expect(screen.getByDisplayValue('Existing Task')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument()
  })

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const { onCancel } = renderTaskForm()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('shows the Issue type selector and an optional Epic picker for a new issue (defaults to Task)', async () => {
    renderTaskForm()

    // getByRole (unlike getByLabelText) excludes Radix's aria-hidden shadow <select>, avoiding a
    // false "multiple elements" match against the one real, visible trigger.
    expect(screen.getByRole('combobox', { name: /Issue type/ })).toBeInTheDocument()
    expect(await screen.findByLabelText('Link to an Epic (optional)')).toBeInTheDocument()
    // The Sub-task-only required parent picker shouldn't show for the default "Task" type.
    expect(screen.queryByLabelText('Select the parent Story/Task/Bug')).not.toBeInTheDocument()
  })

  it('hides the Issue type/parent controls when editing an existing issue (immutable after creation)', () => {
    renderTaskForm({
      submitLabel: 'Update',
      initialValues: {
        id: 't-1',
        title: 'Existing Story',
        description: 'desc',
        project: { id: 'p-1', name: 'Project' },
        assignee: null,
        status: 'Todo',
        statusCategory: 'To Do',
        priority: 'P1',
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
        issueType: 'Story',
        parent: null,
        storyPoints: null,
        issueKey: 'PRJ-7',
        labels: [],
        components: [],
        fixVersions: [],
        affectsVersions: [],
        originalEstimateHours: null,
        customFieldValues: {},
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    })

    expect(screen.queryByLabelText('Issue type')).not.toBeInTheDocument()
    // Exact match - "Story" alone, not a substring collision with the "Story points" field label.
    expect(screen.getByText('Story')).toBeInTheDocument()
    expect(screen.getByText('PRJ-7', { exact: false })).toBeInTheDocument()
  })
})
