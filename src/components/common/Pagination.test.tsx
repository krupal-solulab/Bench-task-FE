import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Pagination } from './Pagination'

describe('Pagination', () => {
  it('disables Previous on the first page and Next on the last page', () => {
    render(
      <Pagination
        page={1}
        limit={20}
        total={20}
        totalPages={1}
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('Previous page')).toBeDisabled()
    expect(screen.getByLabelText('Next page')).toBeDisabled()
  })

  it('calls onPageChange with the next page when Next is clicked', async () => {
    const onPageChange = vi.fn()
    render(
      <Pagination
        page={1}
        limit={20}
        total={100}
        totalPages={5}
        onPageChange={onPageChange}
        onLimitChange={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByLabelText('Next page'))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('shows "No results" when total is zero', () => {
    render(
      <Pagination
        page={1}
        limit={20}
        total={0}
        totalPages={0}
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
      />,
    )
    expect(screen.getByText('No results')).toBeInTheDocument()
  })
})
