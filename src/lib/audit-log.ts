/** `AuditAction` values are PascalCase words with no acronyms (e.g. "UserRoleChanged"), so a
 * regex split reads fine and avoids maintaining a 17-entry display-name map by hand. */
export function formatAuditAction(action: string): string {
  return action.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
}

export function formatAuditMetadata(metadata: Record<string, unknown> | null | undefined): string {
  const entries = Object.entries(metadata ?? {})
  if (entries.length === 0) return '—'
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(', ')
}
