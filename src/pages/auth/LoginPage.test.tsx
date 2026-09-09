import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthProvider } from '@/context/AuthContext'
import { LoginPage } from '@/pages/auth/LoginPage'

// AuthProvider persists the refresh token to localStorage, which jsdom does not reset between
// tests on its own - without this, a successful login in one test leaks into the next test's
// fresh AuthProvider (its bootstrap effect silently refreshes and redirects before the form
// ever renders).
beforeEach(() => {
  localStorage.clear()
})

function renderLoginPage(initialEntry = '/login') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<div>Dashboard Home</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  it('shows validation errors for an empty submission', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
  })

  it('rejects an invalid email format', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText('Email', { exact: false }), 'not-an-email')
    await user.type(screen.getByLabelText('Password', { exact: false }), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
  })

  it('shows a friendly error for invalid credentials', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText('Email', { exact: false }), 'admin@example.com')
    await user.type(screen.getByLabelText('Password', { exact: false }), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
  })

  it('logs in and navigates to the dashboard on valid credentials', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText('Email', { exact: false }), 'admin@example.com')
    await user.type(screen.getByLabelText('Password', { exact: false }), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(screen.getByText('Dashboard Home')).toBeInTheDocument())
  })

  it('honours a returnTo query param after a successful login', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/login?returnTo=%2Fprojects']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/projects" element={<div>Projects Home</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Email', { exact: false }), 'admin@example.com')
    await user.type(screen.getByLabelText('Password', { exact: false }), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(screen.getByText('Projects Home')).toBeInTheDocument())
  })
})
