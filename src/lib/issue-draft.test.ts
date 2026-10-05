import { describe, expect, it } from 'vitest'
import { draftIssue } from './issue-draft'

const context = {
  issueTypes: ['Bug', 'Story', 'Task'],
  labels: ['payments', 'mobile', 'ui'],
  components: ['Checkout', 'API'],
}

describe('draftIssue (Module 10 gap-closure)', () => {
  it('drafts a bug: clean title, P1 from urgency words, and the project labels/components it mentions', () => {
    const draft = draftIssue(
      'Urgent: Checkout crashes on Safari when the cart is empty. Seen on mobile, payments fail.',
      context,
    )
    expect(draft).toEqual({
      title: 'Checkout crashes on Safari when the cart is empty',
      description:
        'Urgent: Checkout crashes on Safari when the cart is empty. Seen on mobile, payments fail.',
      issueType: 'Bug',
      priority: 'P1',
      labels: ['payments', 'mobile'],
      components: ['Checkout'],
    })
  })

  it('drafts a story from "as a user" phrasing, P2 by default', () => {
    const draft = draftIssue(
      'As a user I want to export my invoices so that I can file taxes',
      context,
    )
    expect(draft).toMatchObject({ issueType: 'Story', priority: 'P2', labels: [], components: [] })
  })

  it('falls back to Task, picks P3 for low-priority wording, and only proposes types the project has', () => {
    expect(draftIssue('Update the footer copyright year, nice to have', context)).toMatchObject({
      issueType: 'Task',
      priority: 'P3',
    })
    expect(
      draftIssue('Login is broken', { issueTypes: ['Task'], labels: [], components: [] })
        ?.issueType,
    ).toBe('Task')
    expect(
      draftIssue('Login is broken', { issueTypes: ['Feature'], labels: [], components: [] })
        ?.issueType,
    ).toBeNull()
  })

  it('caps long titles, matches whole words only, and needs some text', () => {
    const long = draftIssue(`${'word '.repeat(60)}end`, context)!
    expect(long.title.length).toBeLessThanOrEqual(120)
    expect(long.title.endsWith('…')).toBe(true)
    expect(draftIssue('Build a guide for the team', context)?.labels).toEqual([]) // "ui" inside "guide"
    expect(draftIssue('  ', context)).toBeNull()
  })
})
