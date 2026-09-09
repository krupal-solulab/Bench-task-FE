import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthProvider } from '@/context/AuthContext'
import { RegisterOrganizationPage } from '@/pages/auth/RegisterOrganizationPage'

beforeEach(() => {
  localStorage.clear()
})

function renderRegisterPage() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <AuthProvider>
        <Routes>
          <Route path="/register" element={<RegisterOrganizationPage />} />
          <Route path="/dashboard" element={<div>Dashboard Home</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

async function fillValidForm(
  user: ReturnType<typeof userEvent.setup>,
  overrides: Partial<{
    organizationName: string
    adminName: string
    adminEmail: string
    adminPassword: string
    confirmPassword: string
  }> = {},
) {
  const values = {
    organizationName: 'Acme Inc',
    adminName: 'Ann Admin',
    adminEmail: 'new-admin@example.com',
    adminPassword: 'Password123',
    confirmPassword: 'Password123',
    ...overrides,
  }
  await user.type(
    screen.getByLabelText('Organization name', { exact: false }),
    values.organizationName,
  )
  await user.type(screen.getByLabelText('Admin name', { exact: false }), values.adminName)
  await user.type(screen.getByLabelText('Admin email', { exact: false }), values.adminEmail)
  await user.type(screen.getByLabelText('Admin password', { exact: false }), values.adminPassword)
  await user.type(
    screen.getByLabelText('Confirm password', { exact: false }),
    values.confirmPassword,
  )
}

describe('RegisterOrganizationPage', () => {
  it('shows validation errors for an empty submission', async () => {
    const user = userEvent.setup()
    renderRegisterPage()

    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(
      await screen.findByText('Organization name must be at least 2 characters'),
    ).toBeInTheDocument()
  })

  it('rejects a password that does not meet the strength rule', async () => {
    const user = userEvent.setup()
    renderRegisterPage()

    await fillValidForm(user, { adminPassword: 'short', confirmPassword: 'short' })
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Password must be at least 8 characters')).toBeInTheDocument()
  })

  it('rejects mismatched password confirmation', async () => {
    const user = userEvent.setup()
    renderRegisterPage()

    await fillValidForm(user, { confirmPassword: 'Different123' })
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument()
  })

  it('shows an inline field error when the admin email is already registered', async () => {
    const user = userEvent.setup()
    renderRegisterPage()

    // admin@example.com already exists per the shared MSW fixtures.
    await fillValidForm(user, { adminEmail: 'admin@example.com' })
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('An account with this email already exists')).toBeInTheDocument()
  })

  it('registers and navigates to the dashboard on valid input', async () => {
    const user = userEvent.setup()
    renderRegisterPage()

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(screen.getByText('Dashboard Home')).toBeInTheDocument())
  })
})
