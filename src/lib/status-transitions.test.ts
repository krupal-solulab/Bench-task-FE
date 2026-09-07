import { describe, expect, it } from 'vitest'
import {
  isLegalProjectTransition,
  isLegalTaskTransition,
  legalProjectTransitions,
  legalTaskTransitions,
} from './status-transitions'

describe('status-transitions', () => {
  it('offers only the legal next statuses for a task in Todo', () => {
    expect(legalTaskTransitions('Todo')).toEqual(['In Progress'])
  })

  it('offers no further transitions once a task is Done', () => {
    expect(legalTaskTransitions('Done')).toEqual([])
  })

  it('allows moving a Review task back to In Progress or forward to Done', () => {
    expect(legalTaskTransitions('Review')).toEqual(['Done', 'In Progress'])
  })

  it('rejects an illegal task transition (Todo -> Done)', () => {
    expect(isLegalTaskTransition('Todo', 'Done')).toBe(false)
  })

  it('accepts a legal task transition (Todo -> In Progress)', () => {
    expect(isLegalTaskTransition('Todo', 'In Progress')).toBe(true)
  })

  it('offers only Completed and Planning from In Progress for a project', () => {
    expect(legalProjectTransitions('In Progress')).toEqual(['Completed', 'Planning'])
  })

  it('rejects re-opening a Completed project', () => {
    expect(isLegalProjectTransition('Completed', 'Planning')).toBe(false)
  })
})
