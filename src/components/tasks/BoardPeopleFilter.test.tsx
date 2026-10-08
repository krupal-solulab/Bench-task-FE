import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { BoardPeopleFilter, UNASSIGNED_FILTER } from '@/components/tasks/BoardPeopleFilter'

const people = ['Ada', 'Ben', 'Cy', 'Di', 'Ed', 'Flo', 'Gus', 'Hal'].map((name) => ({
  id: name.toLowerCase(),
  name,
}))

function Harness({ onChange }: { onChange?: (next: string[]) => void }) {
  const [selected, setSelected] = useState<string[]>([])
  return (
    <>
      <BoardPeopleFilter
        people={people}
        selected={selected}
        currentUserId="ed"
        onChange={(next) => {
          setSelected(next)
          onChange?.(next)
        }}
      />
      <output>{selected.join(',')}</output>
    </>
  )
}

describe('BoardPeopleFilter', () => {
  it('shows the current user first, six avatars inline, and the rest behind +N', () => {
    render(<Harness />)

    const avatars = screen.getAllByRole('button', { name: /^Show .*'s issues$/ })
    expect(avatars).toHaveLength(6)
    expect(avatars[0]).toHaveAccessibleName("Show Ed (you)'s issues")
    expect(screen.getByRole('button', { name: '2 more people' })).toHaveTextContent('+2')
  })

  it('toggles any combination of people and Unassigned', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: "Show Ben's issues" }))
    await user.click(screen.getByRole('button', { name: 'Unassigned' }))
    expect(screen.getByRole('status')).toHaveTextContent(`ben,${UNASSIGNED_FILTER}`)
    expect(screen.getByRole('button', { name: "Show Ben's issues" })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await user.click(screen.getByRole('button', { name: "Show Ben's issues" }))
    expect(screen.getByRole('status')).toHaveTextContent(UNASSIGNED_FILTER)
  })

  it('picks overflowed people from the searchable +N menu', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: '2 more people' }))
    await user.type(screen.getByRole('textbox', { name: 'Search people' }), 'ha')
    expect(screen.queryByText('Gus')).not.toBeInTheDocument()
    await user.click(screen.getByRole('checkbox'))

    expect(screen.getByRole('status')).toHaveTextContent('hal')
  })
})
