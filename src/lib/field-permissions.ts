import type { FieldPermissionScheme } from '@/types/field-permission-scheme.types'
import type { Role } from '@/types/user.types'

/** Mirrors the backend's own field-permission-scheme.schema.ts pure functions exactly (the same
 * duplication convention status-transitions.ts already uses for isLegalTaskTransition/
 * legalTaskTransitions) - the backend remains the real authority; this is purely a UI affordance
 * so a restricted field is hidden or shown read-only before a submit round-trip would 403. */
export function canViewField(
  scheme: Pick<FieldPermissionScheme, 'rules'> | null | undefined,
  fieldId: string,
  role: Role,
): boolean {
  if (!scheme) return true
  const rule = scheme.rules.find((r) => r.fieldId === fieldId)
  if (!rule) return true
  return !rule.hiddenFromRoles.includes(role)
}

export function canEditField(
  scheme: Pick<FieldPermissionScheme, 'rules'> | null | undefined,
  fieldId: string,
  role: Role,
): boolean {
  if (!scheme) return true
  const rule = scheme.rules.find((r) => r.fieldId === fieldId)
  if (!rule) return true
  if (rule.hiddenFromRoles.includes(role)) return false
  return !rule.readOnlyForRoles.includes(role)
}
