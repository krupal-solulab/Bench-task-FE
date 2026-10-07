import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DatePicker } from '@/components/common/DatePicker'
import { pickDate } from '@/test/utils/datePicker'

describe('DatePicker', () => {
  it('emits the picked day as YYYY-MM-DD and closes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DatePicker label="Due" value={null} onChange={onChange} />)

    await pickDate(user, screen.getByLabelText('Due'), '2024-02-29')

    expect(onChange).toHaveBeenCalledWith('2024-02-29')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows a full ISO timestamp by its calendar date and opens on that month', async () => {
    const user = userEvent.setup()
    render(<DatePicker label="Due" value="2026-03-01T00:00:00.000Z" onChange={vi.fn()} />)

    const trigger = screen.getByLabelText('Due')
    expect(trigger).toHaveTextContent('Mar 1, 2026')
    await user.click(trigger)
    const calendar = screen.getByRole('dialog')
    expect(within(calendar).getByText('March 2026')).toBeInTheDocument()
    expect(within(calendar).getByRole('gridcell', { name: 'March 1, 2026' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('always renders a fixed six-week grid', async () => {
    const user = userEvent.setup()
    // February 2026 starts on a Sunday and fits in four weeks - still six rows, no resize.
    render(<DatePicker label="Due" value="2026-02-10" onChange={vi.fn()} />)

    await user.click(screen.getByLabelText('Due'))
    expect(within(screen.getByRole('dialog')).getAllByRole('gridcell')).toHaveLength(42)
  })

  it('Clear emits null', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DatePicker label="Due" value="2026-03-01" onChange={onChange} />)

    await user.click(screen.getByLabelText('Due'))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Clear' }))

    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('disables days outside min/max', async () => {
    const user = userEvent.setup()
    render(
      <DatePicker
        label="Due"
        value="2026-03-15"
        min="2026-03-10"
        max="2026-03-20"
        onChange={vi.fn()}
      />,
    )

    await user.click(screen.getByLabelText('Due'))
    const calendar = screen.getByRole('dialog')
    expect(within(calendar).getByRole('gridcell', { name: 'March 9, 2026' })).toBeDisabled()
    expect(within(calendar).getByRole('gridcell', { name: 'March 10, 2026' })).toBeEnabled()
    expect(within(calendar).getByRole('gridcell', { name: 'March 21, 2026' })).toBeDisabled()
  })

  it('moves by keyboard across months and selects with Enter', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DatePicker label="Due" value="2026-03-31" onChange={onChange} />)

    await user.click(screen.getByLabelText('Due'))
    expect(screen.getByRole('gridcell', { name: 'March 31, 2026' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('gridcell', { name: 'April 1, 2026' })).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(onChange).toHaveBeenCalledWith('2026-04-01')
  })
})
