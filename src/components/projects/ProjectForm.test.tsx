import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProjectForm } from '@/components/projects/ProjectForm'

describe('ProjectForm', () => {
  it('rejects a name shorter than 3 characters', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ProjectForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText('Name', { exact: false }), 'ab')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Name must be at least 3 characters')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits with a valid name and default empty description', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<ProjectForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText('Name', { exact: false }), 'A New Project')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0]![0]).toEqual(
      expect.objectContaining({ name: 'A New Project', description: '' }),
    )
  })

  it('pre-fills fields (including dates) from initialValues when editing (regression: the API returns full ISO datetimes, which a native date input silently rejects unless trimmed to YYYY-MM-DD)', () => {
    render(
      <ProjectForm
        initialValues={{
          id: 'p-1',
          name: 'Existing Project',
          description: 'Existing description',
          status: 'Planning',
          owner: {
            id: 'u-1',
            name: 'Owner',
            email: 'o@a.com',
            role: 'Admin',
            isActive: true,
            organizationId: 'org-1',
            createdAt: '',
            updatedAt: '',
          },
          members: [],
          startDate: '2026-01-01T00:00:00.000Z',
          dueDate: null,
          taskCount: 0,
          components: [],
          customFields: [],
          automationRules: [],
          issueTypes: [],
          permissionSchemeId: null,
          notificationScheme: [],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        submitLabel="Update"
      />,
    )

    expect(screen.getByDisplayValue('Existing Project')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Existing description')).toBeInTheDocument()
    expect(screen.getByLabelText('Start date', { exact: false })).toHaveValue('2026-01-01')
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument()
  })

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<ProjectForm onSubmit={vi.fn()} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
