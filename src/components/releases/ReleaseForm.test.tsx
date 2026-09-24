import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReleaseForm } from '@/components/releases/ReleaseForm'

describe('ReleaseForm', () => {
  it('rejects a blank name', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ReleaseForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Name is required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits with a name, description, and target date', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<ReleaseForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText('Name', { exact: false }), 'v2.4.0')
    await user.type(screen.getByLabelText('Description', { exact: false }), 'Q3 release')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0]![0]).toEqual(
      expect.objectContaining({ name: 'v2.4.0', description: 'Q3 release' }),
    )
  })

  it('pre-fills fields from initialValues when editing', () => {
    render(
      <ReleaseForm
        initialValues={{
          id: 'r-1',
          name: 'v1.0.0',
          description: 'First release',
          project: 'p-1',
          status: 'Unreleased',
          releaseDate: '2026-03-01T00:00:00.000Z',
          releasedAt: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        submitLabel="Save changes"
      />,
    )

    expect(screen.getByDisplayValue('v1.0.0')).toBeInTheDocument()
    expect(screen.getByDisplayValue('First release')).toBeInTheDocument()
    expect(screen.getByLabelText('Target release date', { exact: false })).toHaveValue('2026-03-01')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
  })

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<ReleaseForm onSubmit={vi.fn()} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
