import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OverflowTabsList } from '@/components/common/OverflowTabsList'
import { Tabs } from '@/components/ui/tabs'

const TABS = ['Board', 'Backlog', 'Epics', 'List', 'Members', 'Workflow', 'SLA'].map((label) => ({
  value: label.toLowerCase(),
  label,
}))

function Harness({ initial = 'board' }: { initial?: string }) {
  const [tab, setTab] = useState(initial)
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <OverflowTabsList tabs={TABS} value={tab} onValueChange={setTab} />
      <p>Showing {tab}</p>
    </Tabs>
  )
}

describe('OverflowTabsList', () => {
  // jsdom has no layout: fake every measured span at 100px and the bar at 508px (500 usable).
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(100)
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(508)
  })
  afterEach(() => vi.restoreAllMocks())

  it('keeps the tabs that fit inline and moves the rest into More, with no scrolling', () => {
    render(<Harness />)

    // 500px - 120px for "More" (100 + chevron) leaves room for three 100px tabs.
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Board',
      'Backlog',
      'Epics',
    ])
    expect(screen.getByRole('button', { name: 'More' })).toBeInTheDocument()
  })

  it('picking an overflowed tab activates it and the More button takes its name', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'More' }))
    await user.click(screen.getByRole('menuitem', { name: 'Workflow' }))

    expect(screen.getByText('Showing workflow')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Workflow' })).toBeInTheDocument()
  })

  it('shows every tab and no menu when they all fit', () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(2000)
    render(<Harness />)

    expect(screen.getAllByRole('tab')).toHaveLength(TABS.length)
    expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument()
  })
})
