import type { AutomationRule } from '@/types/project.types'

/** How many enabled automation rules fire on this exact from->to transition - a rule with no
 * `fromStatus` set applies to "any status -> toStatus", matching evaluateAutomationRules's own
 * matching logic on the backend (automation-rule.schema.ts). Extracted out of WorkflowCanvas.tsx
 * so that file can stay component-only (react-refresh/only-export-components) and so this pure
 * function is directly unit-testable - edges don't render under jsdom (no layout measurement),
 * so this can't be exercised via a simulated edge click. */
export function countRulesForTransition(rules: AutomationRule[], from: string, to: string): number {
  return rules.filter(
    (r) =>
      r.enabled &&
      r.trigger.type === 'StatusChanged' &&
      r.trigger.toStatus === to &&
      (!r.trigger.fromStatus || r.trigger.fromStatus === from),
  ).length
}
