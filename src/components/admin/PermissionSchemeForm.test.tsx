import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PermissionSchemeForm } from './PermissionSchemeForm'
import type { PermissionGrant } from '@/types/permission-scheme.types'

function renderForm(props: Partial<React.ComponentProps<typeof PermissionSchemeForm>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue(undefined)
  const onCancel = props.onCancel ?? vi.fn()
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <PermissionSchemeForm
        onSubmit={onSubmit}
        onCancel={onCancel}
        submitLabel="Create scheme"
        {...props}
      />
    </QueryClientProvider>,
  )
  return { ...utils, onSubmit, onCancel }
}

describe('PermissionSchemeForm', () => {
  it('renders all 6 BRD actions, each unconfigured by default (regression)', () => {
    renderForm()
    expect(screen.getByText('Create issue')).toBeInTheDocument()
    expect(screen.getByText('Assign')).toBeInTheDocument()
    expect(screen.getByText('Change status')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
    expect(screen.getByText('Edit task fields')).toBeInTheDocument()
    expect(screen.getByText('Manage sprints')).toBeInTheDocument()
    expect(screen.getByLabelText('Create issue: Developer')).not.toBeChecked()
  })

  it('disables submit until a name is entered', async () => {
    const user = userEvent.setup()
    renderForm()
    expect(screen.getByRole('button', { name: 'Create scheme' })).toBeDisabled()
    await user.type(screen.getByLabelText('Name', { exact: false }), 'x')
    expect(screen.getByRole('button', { name: 'Create scheme' })).toBeEnabled()
  })

  it('checking a role checkbox and submitting includes it in the grant', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderForm({ onSubmit })

    await user.type(screen.getByLabelText('Name', { exact: false }), 'Open scheme')
    await user.click(screen.getByLabelText('Create issue: Developer'))
    await user.click(screen.getByRole('button', { name: 'Create scheme' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Open scheme',
        grants: expect.arrayContaining([
          expect.objectContaining({ action: 'CreateIssue', allowedRoles: ['Developer'] }),
        ]),
      }),
    )
  })

  it('pre-fills name and grants from initialValues when editing', () => {
    const grants: PermissionGrant[] = [
      { action: 'Delete', allowedRoles: ['Manager'], allowedUserIds: [] },
    ]
    renderForm({ initialValues: { name: 'Strict', grants }, submitLabel: 'Save changes' })

    expect(screen.getByDisplayValue('Strict')).toBeInTheDocument()
    expect(screen.getByLabelText('Delete: Manager')).toBeChecked()
    expect(screen.getByLabelText('Create issue: Manager')).not.toBeChecked()
  })
})
