import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TagInput } from './TagInput'

describe('TagInput', () => {
  it('adds a free-form tag on Enter and clears the draft', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TagInput value={[]} onChange={onChange} placeholder="Add a label" />)

    await user.type(screen.getByPlaceholderText('Add a label'), 'urgent{Enter}')

    expect(onChange).toHaveBeenCalledWith(['urgent'])
  })

  it('adds a tag on comma', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TagInput value={[]} onChange={onChange} placeholder="Add a label" />)

    await user.type(screen.getByPlaceholderText('Add a label'), 'bug,')

    expect(onChange).toHaveBeenCalledWith(['bug'])
  })

  it('does not add a duplicate tag', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TagInput value={['bug']} onChange={onChange} />)

    const input = screen.getAllByRole('textbox')[0]!
    await user.type(input, 'bug{Enter}')

    expect(onChange).not.toHaveBeenCalled()
  })

  it('removes a tag when its remove button is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TagInput value={['bug', 'urgent']} onChange={onChange} />)

    await user.click(screen.getByLabelText('Remove bug'))

    expect(onChange).toHaveBeenCalledWith(['urgent'])
  })

  it('with a fixed suggestion list, refuses free text not in the list', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TagInput value={[]} onChange={onChange} suggestions={['Frontend', 'API']} />)

    const input = screen.getAllByRole('textbox')[0]!
    await user.type(input, 'Backend{Enter}')

    expect(onChange).not.toHaveBeenCalled()
  })

  it('with a fixed suggestion list, adds a suggested value by clicking it', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TagInput value={[]} onChange={onChange} suggestions={['Frontend', 'API']} />)

    await user.click(screen.getByRole('button', { name: '+ Frontend' }))

    expect(onChange).toHaveBeenCalledWith(['Frontend'])
  })

  it('hides the input and remove buttons when disabled', () => {
    render(<TagInput value={['bug']} onChange={vi.fn()} disabled />)

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Remove bug')).not.toBeInTheDocument()
    expect(screen.getByText('bug')).toBeInTheDocument()
  })
})
