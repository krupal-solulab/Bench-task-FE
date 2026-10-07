import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { mockProjects } from '@/test/mocks/fixtures'

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
      expect.objectContaining({ name: 'A New Project', description: '', boardType: 'Scrum' }),
    )
  })

  it('defaults board type to Scrum for a new project (Phase 2 gap-closure - BRD 6.3)', () => {
    render(<ProjectForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('combobox', { name: 'Board type' })).toHaveTextContent('Scrum')
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
    expect(screen.getByLabelText('Start date', { exact: false })).toHaveTextContent('Jan 1, 2026')
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument()
  })

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<ProjectForm onSubmit={vi.fn()} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
  describe('category picker (Module 8 gap-closure)', () => {
    const CATEGORIES = [
      { id: 'cat-1', name: 'Client Work', description: '', createdAt: '', updatedAt: '' },
    ]

    it('is hidden when the org has no categories', () => {
      render(<ProjectForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
      expect(screen.queryByRole('combobox', { name: 'Category' })).not.toBeInTheDocument()
    })

    it('submits null when no category is chosen', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      render(<ProjectForm onSubmit={onSubmit} onCancel={vi.fn()} categories={CATEGORIES} />)

      expect(screen.getByRole('combobox', { name: 'Category' })).toHaveTextContent('No category')
      await user.type(screen.getByLabelText('Name', { exact: false }), 'Uncategorized')
      await user.click(screen.getByRole('button', { name: 'Save' }))
      expect(onSubmit.mock.calls[0]![0]).toEqual(expect.objectContaining({ categoryId: null }))
    })

    it("pre-selects and keeps an existing project's category when editing", async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      render(
        <ProjectForm
          initialValues={
            { ...mockProjects[0]!, categoryId: 'cat-1' } as Parameters<
              typeof ProjectForm
            >[0]['initialValues']
          }
          onSubmit={onSubmit}
          onCancel={vi.fn()}
          categories={CATEGORIES}
        />,
      )

      expect(screen.getByRole('combobox', { name: 'Category' })).toHaveTextContent('Client Work')
      await user.click(screen.getByRole('button', { name: 'Save' }))
      expect(onSubmit.mock.calls[0]![0]).toEqual(expect.objectContaining({ categoryId: 'cat-1' }))
    })
  })
  describe('templates (Module 8 gap-closure)', () => {
    const TEMPLATES = [{ id: 'tpl-1', name: 'Delivery template' }]

    it('offers "Start from template" on create, defaulting to a blank project', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      render(<ProjectForm onSubmit={onSubmit} onCancel={vi.fn()} templates={TEMPLATES} />)

      expect(screen.getByRole('combobox', { name: 'Start from template' })).toHaveTextContent(
        'Blank project',
      )
      await user.type(screen.getByLabelText('Name', { exact: false }), 'Blank one')
      await user.click(screen.getByRole('button', { name: 'Save' }))
      const values = onSubmit.mock.calls[0]![0]
      expect(values.templateProjectId).toBeUndefined()
      expect(values.isTemplate).toBe(false)
    })

    it('never offers the template picker when editing an existing project', () => {
      render(
        <ProjectForm
          initialValues={mockProjects[0]!}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          templates={TEMPLATES}
        />,
      )
      expect(
        screen.queryByRole('combobox', { name: 'Start from template' }),
      ).not.toBeInTheDocument()
    })

    it('submits isTemplate when "Offer as a template" is ticked', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      render(<ProjectForm onSubmit={onSubmit} onCancel={vi.fn()} />)

      await user.type(screen.getByLabelText('Name', { exact: false }), 'Reusable')
      await user.click(
        screen.getByRole('checkbox', { name: 'Offer as a template for new projects' }),
      )
      await user.click(screen.getByRole('button', { name: 'Save' }))
      expect(onSubmit.mock.calls[0]![0]).toEqual(expect.objectContaining({ isTemplate: true }))
    })
  })
})
