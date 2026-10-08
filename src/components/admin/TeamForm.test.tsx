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

  it('submits capacityPoints as a number when entered (Module 6 gap-closure)', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderForm({ onSubmit })

    await user.type(screen.getByLabelText('Name', { exact: false }), 'Platform Squad')
    await user.type(screen.getByLabelText('Capacity (story points)', { exact: false }), '20')
    await user.click(screen.getByRole('button', { name: 'Create team' }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ capacityPoints: 20 }))
  })

  it('omits capacityPoints entirely when left blank (Module 6 gap-closure)', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderForm({ onSubmit })

    await user.type(screen.getByLabelText('Name', { exact: false }), 'Platform Squad')
    await user.click(screen.getByRole('button', { name: 'Create team' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.not.objectContaining({ capacityPoints: expect.anything() }),
    )
  })

  it('pre-fills name and description from initialValues when editing', () => {
    renderForm({
      initialValues: {
        name: 'QA Guild',
        description: 'Owns QA',
        leadId: null,
        memberIds: [],
        capacityPoints: null,
      },
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

  it('never offers people who are already in the team (and offers them again once removed)', async () => {
    const user = userEvent.setup()
    renderForm({
      initialValues: {
        name: 'Backend Guild',
        description: '',
        leadId: null,
        memberIds: ['u-dev1'],
        capacityPoints: null,
      },
    })
    const options = async () => {
      await user.click(await screen.findByRole('combobox', { name: '+ Add a member…' }))
      const names = (await screen.findAllByRole('option')).map((o) => o.textContent)
      await user.keyboard('{Escape}')
      return names
    }

    expect((await options()).some((n) => n?.startsWith('Dev One'))).toBe(false)
    expect((await options()).some((n) => n?.startsWith('Dev Two'))).toBe(true)

    await user.click(await screen.findByRole('button', { name: 'Remove Dev One' }))
    expect((await options()).some((n) => n?.startsWith('Dev One'))).toBe(true)
  })
})
