import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SprintForm } from '@/components/sprints/SprintForm'

describe('SprintForm', () => {
  it('rejects a name shorter than 3 characters', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<SprintForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText('Name', { exact: false }), 'ab')
    fireEvent.change(screen.getByLabelText('Start date', { exact: false }), {
      target: { value: '2026-01-01' },
    })
    fireEvent.change(screen.getByLabelText('End date', { exact: false }), {
      target: { value: '2026-01-14' },
    })
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Name must be at least 3 characters')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects an end date before the start date', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<SprintForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText('Name', { exact: false }), 'Sprint 12')
    fireEvent.change(screen.getByLabelText('Start date', { exact: false }), {
      target: { value: '2026-02-01' },
    })
    fireEvent.change(screen.getByLabelText('End date', { exact: false }), {
      target: { value: '2026-01-01' },
    })
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      await screen.findByText('End date must be on or after the start date'),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits with valid dates', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<SprintForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText('Name', { exact: false }), 'Sprint 12')
    fireEvent.change(screen.getByLabelText('Start date', { exact: false }), {
      target: { value: '2026-01-01' },
    })
    fireEvent.change(screen.getByLabelText('End date', { exact: false }), {
      target: { value: '2026-01-14' },
    })
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0]![0]).toEqual(
      expect.objectContaining({
        name: 'Sprint 12',
        startDate: '2026-01-01',
        endDate: '2026-01-14',
      }),
    )
  })

  it('pre-fills fields (including dates) from initialValues when editing (regression: the API returns full ISO datetimes, which a native date input silently rejects unless trimmed to YYYY-MM-DD)', () => {
    render(
      <SprintForm
        initialValues={{
          id: 's-1',
          name: 'Existing Sprint',
          goal: 'Ship it',
          project: 'p-1',
          status: 'Planned',
          // Realistic shape: the API returns a full ISO datetime, not a bare date.
          startDate: '2026-01-01T00:00:00.000Z',
          endDate: '2026-01-14T00:00:00.000Z',
          startedAt: null,
          completedAt: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        submitLabel="Save"
      />,
    )

    expect(screen.getByDisplayValue('Existing Sprint')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Ship it')).toBeInTheDocument()
    expect(screen.getByLabelText('Start date', { exact: false })).toHaveValue('2026-01-01')
    expect(screen.getByLabelText('End date', { exact: false })).toHaveValue('2026-01-14')
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<SprintForm onSubmit={vi.fn()} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
