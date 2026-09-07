import { describe, expect, it } from 'vitest'
import { renderWithProviders, screen } from '@/test/utils/render'
import { DashboardPage } from './DashboardPage'

describe('DashboardPage', () => {
  it('renders the page heading', () => {
    renderWithProviders(<DashboardPage />)
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })
})
