export interface IssueNavigatorColumnLayout {
  order: string[]
  widths: Record<string, number>
}

const STORAGE_KEY = 'issue-navigator-columns-v1'

/** Per-browser column order/width preference for the Issue Navigator's spreadsheet-style table
 * (Module 4 gap-closure: "reorder/resize") - a personal display preference, not data other users
 * or Claude need to read back, so localStorage is the right store (same reasoning as
 * useRecentlyViewed's own doc comment). */
export function readColumnLayout(): IssueNavigatorColumnLayout | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as IssueNavigatorColumnLayout).order) &&
      typeof (parsed as IssueNavigatorColumnLayout).widths === 'object'
    ) {
      return parsed as IssueNavigatorColumnLayout
    }
    return null
  } catch {
    return null
  }
}

export function writeColumnLayout(layout: IssueNavigatorColumnLayout): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
  } catch {
    // Private-browsing/storage-disabled - a lost column layout preference is never worth
    // breaking the page over.
  }
}

/** Merges a saved column order with the CURRENT set of known column keys - if a column was added
 * or removed in a later release, a saved order shouldn't silently drop the new one or keep a
 * dangling key for a column that no longer exists. */
export function resolveColumnOrder(saved: string[] | null, knownKeys: string[]): string[] {
  if (!saved) return knownKeys
  const known = new Set(knownKeys)
  const kept = saved.filter((k) => known.has(k))
  const missing = knownKeys.filter((k) => !kept.includes(k))
  return [...kept, ...missing]
}
