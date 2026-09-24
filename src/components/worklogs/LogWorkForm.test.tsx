import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LogWorkForm } from '@/components/worklogs/LogWorkForm'

describe('LogWorkForm', () => {
  it('rejects zero hours', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<LogWorkForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Hours', { exact: false }), {
      target: { value: '0' },
    })
    fireEvent.change(screen.getByLabelText('Date', { exact: false }), {
      target: { value: '2026-03-01' },
    })
    await user.click(screen.getByRole('button', { name: 'Log work' }))

    expect(await screen.findByText('Must be at least 0.1 hours')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits with hours, date, description, and billable defaulting true', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<LogWorkForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Hours', { exact: false }), {
      target: { value: '3' },
    })
    fireEvent.change(screen.getByLabelText('Date', { exact: false }), {
      target: { value: '2026-03-01' },
    })
    await user.type(screen.getByLabelText('Description', { exact: false }), 'Fixed the bug')
    await user.click(screen.getByRole('button', { name: 'Log work' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0]![0]).toEqual(
      expect.objectContaining({
        hours: 3,
        workDate: '2026-03-01',
        description: 'Fixed the bug',
        billable: true,
      }),
    )
  })

  it('unchecking Billable submits billable: false', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<LogWorkForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Hours', { exact: false }), {
      target: { value: '1' },
    })
    fireEvent.change(screen.getByLabelText('Date', { exact: false }), {
      target: { value: '2026-03-01' },
    })
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Log work' }))

    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ billable: false })
  })

  it('pre-fills fields from initialValues when editing', () => {
    render(
      <LogWorkForm
        initialValues={{
          id: 'wl-1',
          task: 't-1',
          user: {
            id: 'u-1',
            name: 'Dev',
            email: 'd@a.com',
            role: 'Developer',
            isActive: true,
            organizationId: 'org-1',
            createdAt: '',
            updatedAt: '',
          },
          hours: 4,
          description: 'Existing note',
          workDate: '2026-03-01T00:00:00.000Z',
          billable: false,
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        submitLabel="Save changes"
      />,
    )

    expect(screen.getByDisplayValue('4')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Existing note')).toBeInTheDocument()
    expect(screen.getByLabelText('Date', { exact: false })).toHaveValue('2026-03-01')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
  })

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<LogWorkForm onSubmit={vi.fn()} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
