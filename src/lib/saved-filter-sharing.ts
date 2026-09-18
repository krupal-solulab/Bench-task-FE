import type { SavedFilter } from '@/types/saved-filter.types'

/** Whether the caller may delete this saved filter - owner-only, even for a shared one
 * (Search/Dashboards v2). */
export function canDeleteSavedFilter(
  filter: SavedFilter,
  currentUserId: string | undefined,
): boolean {
  return filter.owner === currentUserId
}

/** The small "(shared)" / "(shared by …)" label for a filter list item, or null when the filter
 * isn't shared. */
export function describeSharedBadge(
  filter: SavedFilter,
  currentUserId: string | undefined,
  memberNameById: Record<string, string> | undefined,
): string | null {
  if (filter.visibility !== 'shared') return null
  if (filter.owner === currentUserId) return '(shared)'
  return `(shared by ${memberNameById?.[filter.owner] ?? 'a teammate'})`
}
