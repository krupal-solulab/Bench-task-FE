import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PriorityBadge } from './PriorityBadge'

describe('PriorityBadge', () => {
  it('shows the priority', () => {
    render(<PriorityBadge priority="P1" />)
    expect(screen.getByText('P1')).toBeInTheDocument()
  })

  it('shows "Hidden" when the priority is hidden by field permissions', () => {
    render(<PriorityBadge priority={null} />)
    expect(screen.getByText('Hidden')).toBeInTheDocument()
  })
})
