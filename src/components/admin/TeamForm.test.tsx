import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TeamForm } from './TeamForm'

function renderForm(props: Partial<React.ComponentProps<typeof TeamForm>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue(undefined)
  const onCancel = props.onCancel ?? vi.fn()
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <TeamForm onSubmit={onSubmit} onCancel={onCancel} submitLabel="Create team" {...props} />
    </QueryClientProvider>,
  )
  return { ...utils, onSubmit, onCancel }
}

describe('TeamForm', () => {
  it('disables submit until a name is entered', async () => {
    const user = userEvent.setup()
    renderForm()
    expect(screen.getByRole('button', { name: 'Create team' })).toBeDisabled()
    await user.type(screen.getByLabelText('Name', { exact: false }), 'Backend Guild')
    expect(screen.getByRole('button', { name: 'Create team' })).toBeEnabled()
  })

  it('submits the trimmed name and description', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderForm({ onSubmit })

    await user.type(screen.getByLabelText('Name', { exact: false }), '  Backend Guild  ')
    await user.type(screen.getByLabelText('Description', { exact: false }), 'Owns the API')
    await user.click(screen.getByRole('button', { name: 'Create team' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Backend Guild',
        description: 'Owns the API',
        memberIds: [],
      }),
    )
  })

  it('pre-fills name and description from initialValues when editing', () => {
    renderForm({
      initialValues: { name: 'QA Guild', description: 'Owns QA', leadId: null, memberIds: [] },
      submitLabel: 'Save changes',
    })

    expect(screen.getByDisplayValue('QA Guild')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Owns QA')).toBeInTheDocument()
  })

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const { onCancel } = renderForm()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
