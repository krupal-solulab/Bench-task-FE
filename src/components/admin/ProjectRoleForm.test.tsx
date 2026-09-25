import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProjectRoleForm } from './ProjectRoleForm'

function renderForm(props: Partial<React.ComponentProps<typeof ProjectRoleForm>> = {}) {
  const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue(undefined)
  const onCancel = props.onCancel ?? vi.fn()
  const utils = render(
    <ProjectRoleForm
      onSubmit={onSubmit}
      onCancel={onCancel}
      submitLabel="Create role"
      {...props}
    />,
  )
  return { ...utils, onSubmit, onCancel }
}

describe('ProjectRoleForm', () => {
  it('disables submit until a name is entered', async () => {
    const user = userEvent.setup()
    renderForm()
    expect(screen.getByRole('button', { name: 'Create role' })).toBeDisabled()
    await user.type(screen.getByLabelText('Name', { exact: false }), 'QA Lead')
    expect(screen.getByRole('button', { name: 'Create role' })).toBeEnabled()
  })

  it('submits the trimmed name and description', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderForm({ onSubmit })

    await user.type(screen.getByLabelText('Name', { exact: false }), '  QA Lead  ')
    await user.type(screen.getByLabelText('Description', { exact: false }), 'Owns test sign-off')
    await user.click(screen.getByRole('button', { name: 'Create role' }))

    expect(onSubmit).toHaveBeenCalledWith({ name: 'QA Lead', description: 'Owns test sign-off' })
  })

  it('pre-fills name and description from initialValues when editing', () => {
    renderForm({
      initialValues: { name: 'Deployers', description: 'Can release' },
      submitLabel: 'Save changes',
    })

    expect(screen.getByDisplayValue('Deployers')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Can release')).toBeInTheDocument()
  })

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const { onCancel } = renderForm()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
