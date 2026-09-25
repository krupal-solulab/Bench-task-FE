export interface RecentlyViewedItem {
  id: string
  type: 'task' | 'project'
  label: string
  path: string
}

const STORAGE_KEY = 'recently-viewed'
const MAX_ITEMS = 10

/** Module 10's Cmd+K quick switcher needs a "recently viewed" tier, and nothing in this codebase
 * tracks that today (it's not what `TaskActivity`/`SprintActivity` are for - those are audit
 * trails of *changes*, not per-viewer navigation history). Per-browser only, deliberately: this is
 * a personal navigation convenience, not data other users or Claude should ever need to read back,
 * so localStorage (not a new backend endpoint) is the right store. */
function readAll(): RecentlyViewedItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as RecentlyViewedItem[]) : []
  } catch {
    return []
  }
}

export function getRecentlyViewed(): RecentlyViewedItem[] {
  return readAll()
}

export function addRecentlyViewed(item: RecentlyViewedItem): void {
  try {
    const next = [item, ...readAll().filter((i) => !(i.type === item.type && i.id === item.id))]
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, MAX_ITEMS)))
  } catch {
    // Private-browsing/storage-disabled - a missing "recently viewed" entry is never worth
    // breaking the page over.
  }
}
