import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReleaseForm, type ReleaseFormProps } from '@/components/releases/ReleaseForm'

function renderForm(props: ReleaseFormProps) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ReleaseForm {...props} />
    </QueryClientProvider>,
  )
}

describe('ReleaseForm', () => {
  it('rejects a blank name', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderForm({ onSubmit, onCancel: vi.fn() })

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Name is required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits with a name and description', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderForm({ onSubmit, onCancel: vi.fn() })

    await user.type(screen.getByLabelText('Name', { exact: false }), 'v2.4.0')
    await user.type(screen.getByLabelText('Description', { exact: false }), 'Q3 release')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0]![0]).toEqual(
      expect.objectContaining({ name: 'v2.4.0', description: 'Q3 release' }),
    )
  })

  // Regression: the target date is documented as optional, but an untouched DatePicker defaults
  // to '' (not undefined) to stay controlled - that '' must never reach the backend's
  // `@IsOptional() @IsISO8601()` releaseDate field, which only skips validation for `undefined`
  // and would reject an empty string as invalid ISO8601.
  it('never submits an empty-string releaseDate when the target date is left blank', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderForm({ onSubmit, onCancel: vi.fn() })

    await user.type(screen.getByLabelText('Name', { exact: false }), 'v2.4.0')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0]![0].releaseDate).toBeUndefined()
  })

  it('pre-fills fields from initialValues when editing', () => {
    renderForm({
      initialValues: {
        id: 'r-1',
        name: 'v1.0.0',
        description: 'First release',
        project: 'p-1',
        status: 'Unreleased',
        releaseDate: '2026-03-01T00:00:00.000Z',
        releasedAt: null,
        ownerId: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      onSubmit: vi.fn(),
      onCancel: vi.fn(),
      submitLabel: 'Save changes',
    })

    expect(screen.getByDisplayValue('v1.0.0')).toBeInTheDocument()
    expect(screen.getByDisplayValue('First release')).toBeInTheDocument()
    expect(screen.getByLabelText('Target release date', { exact: false })).toHaveValue('2026-03-01')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
  })

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderForm({ onSubmit: vi.fn(), onCancel })

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  // The owner field is org-scoped (any active org user, not just project members) - just confirm
  // it renders and reacts to loaded data; the actual click-through-to-selection is a Radix Select
  // interaction that hangs under this codebase's Vitest/jsdom setup (see UserSelect's other call
  // sites - none of them test that path either), so it's deferred to live-browser verification.
  it('renders an owner select once assignable users have loaded', async () => {
    renderForm({ onSubmit: vi.fn(), onCancel: vi.fn() })

    expect(await screen.findByLabelText('Select owner')).toBeInTheDocument()
  })
})
