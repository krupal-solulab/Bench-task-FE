import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AdvancedSearchInput } from './AdvancedSearchInput'

describe('AdvancedSearchInput', () => {
  it('disables Search until a query is typed', () => {
    render(<AdvancedSearchInput activeQuery={null} onSearch={vi.fn()} onClear={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Search/ })).toBeDisabled()
  })

  it('calls onSearch with the trimmed query on submit', async () => {
    const onSearch = vi.fn()
    const user = userEvent.setup()
    render(<AdvancedSearchInput activeQuery={null} onSearch={onSearch} onClear={vi.fn()} />)

    await user.type(screen.getByLabelText('Advanced search'), '  status = Done  ')
    await user.click(screen.getByRole('button', { name: /Search/ }))

    expect(onSearch).toHaveBeenCalledWith('status = Done')
  })

  it('shows no Clear button until a query is active', () => {
    render(<AdvancedSearchInput activeQuery={null} onSearch={vi.fn()} onClear={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /Clear/ })).not.toBeInTheDocument()
  })

  it('shows Clear once a query is active, and calls onClear', async () => {
    const onClear = vi.fn()
    const user = userEvent.setup()
    render(<AdvancedSearchInput activeQuery="status = Done" onSearch={vi.fn()} onClear={onClear} />)

    await user.click(screen.getByRole('button', { name: /Clear/ }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('shows a validation error when given one', () => {
    render(
      <AdvancedSearchInput
        activeQuery="bogus = 1"
        onSearch={vi.fn()}
        onClear={vi.fn()}
        error='Unknown field "bogus"'
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Unknown field "bogus"')
  })
})
