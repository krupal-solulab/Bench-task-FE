import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { IssueTypeBadge } from './IssueTypeBadge'
import type { IssueTypeDefinition } from '@/types/issue-type.types'

describe('IssueTypeBadge', () => {
  it('renders the built-in Epic type using the default definitions (regression)', () => {
    render(<IssueTypeBadge issueType="Epic" />)
    expect(screen.getByText('Epic')).toBeInTheDocument()
  })

  it('renders a custom Standard-level type using the project-provided definitions', () => {
    const definitions: IssueTypeDefinition[] = [
      { name: 'Chore', level: 'standard', icon: 'Wrench', color: 'cyan' },
    ]
    render(<IssueTypeBadge issueType="Chore" definitions={definitions} />)
    expect(screen.getByText('Chore')).toBeInTheDocument()
  })

  it('falls back to a generic badge for a name not found in any definitions (regression)', () => {
    render(<IssueTypeBadge issueType="Mystery Type" definitions={[]} />)
    expect(screen.getByText('Mystery Type')).toBeInTheDocument()
  })
})
