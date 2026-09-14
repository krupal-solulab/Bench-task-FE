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
})
