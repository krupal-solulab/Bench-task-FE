import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OverdueBadge } from './OverdueBadge'
import { PriorityBadge } from './PriorityBadge'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('renders the task status text', () => {
    render(<StatusBadge status="In Progress" kind="task" />)
    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it('renders the project status text', () => {
    render(<StatusBadge status="Planning" kind="project" />)
    expect(screen.getByText('Planning')).toBeInTheDocument()
  })

  it("renders a custom workflow's status name with a category-based fallback color", () => {
    render(<StatusBadge status="Shipped" kind="task" category="Done" />)
    const badge = screen.getByText('Shipped')
    expect(badge).toHaveClass('bg-emerald-100')
  })

  it('falls back to the Todo color for an unrecognized status with no category given', () => {
    render(<StatusBadge status="Mystery" kind="task" />)
    const badge = screen.getByText('Mystery')
    expect(badge).toHaveClass('bg-slate-100')
  })
})

describe('PriorityBadge', () => {
  it.each(['P1', 'P2', 'P3'] as const)('renders %s', (priority) => {
    render(<PriorityBadge priority={priority} />)
    expect(screen.getByText(priority)).toBeInTheDocument()
  })
})

describe('OverdueBadge', () => {
  it('renders nothing when the due date is in the future', () => {
    const { container } = render(<OverdueBadge dueDate="2999-01-01T00:00:00.000Z" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when the task is already Done, even if the due date has passed', () => {
    const { container } = render(<OverdueBadge dueDate="2000-01-01T00:00:00.000Z" status="Done" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the Overdue label when the due date has passed and the task is not Done', () => {
    render(<OverdueBadge dueDate="2000-01-01T00:00:00.000Z" status="Todo" />)
    expect(screen.getByText('Overdue')).toBeInTheDocument()
  })
})
