import { describe, expect, it } from 'vitest'
import { countRulesForTransition } from './workflow-automation-badge'
import type { AutomationRule } from '@/types/project.types'

function makeRule(overrides: Partial<AutomationRule> = {}): AutomationRule {
  return {
    id: 'r1',
    name: 'Rule',
    enabled: true,
    trigger: { type: 'StatusChanged', toStatus: 'In Progress' },
    conditions: [],
    actions: [],
    ...overrides,
  }
}

describe('countRulesForTransition', () => {
  it('counts a rule scoped to the exact from->to edge', () => {
    const rules = [
      makeRule({ trigger: { type: 'StatusChanged', toStatus: 'In Progress', fromStatus: 'Todo' } }),
    ]
    expect(countRulesForTransition(rules, 'Todo', 'In Progress')).toBe(1)
    expect(countRulesForTransition(rules, 'Review', 'In Progress')).toBe(0)
  })

  it('counts an unscoped rule (no fromStatus) against any from status leading to toStatus', () => {
    const rules = [makeRule({ trigger: { type: 'StatusChanged', toStatus: 'In Progress' } })]
    expect(countRulesForTransition(rules, 'Todo', 'In Progress')).toBe(1)
    expect(countRulesForTransition(rules, 'Review', 'In Progress')).toBe(1)
  })

  it('excludes disabled rules', () => {
    const rules = [makeRule({ enabled: false })]
    expect(countRulesForTransition(rules, 'Todo', 'In Progress')).toBe(0)
  })

  it('excludes IssueCreated-trigger rules (only StatusChanged rules count)', () => {
    const rules = [makeRule({ trigger: { type: 'IssueCreated', toStatus: null } })]
    expect(countRulesForTransition(rules, 'Todo', 'In Progress')).toBe(0)
  })
})
