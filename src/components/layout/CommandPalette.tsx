import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { NAV_ITEMS } from '@/lib/nav-items'
import { useTaskSearch } from '@/hooks/queries/useTasks'
import { useDebounce } from '@/hooks/useDebounce'
import { useAuth } from '@/hooks/useAuth'
import { getRecentlyViewed, type RecentlyViewedItem } from '@/hooks/useRecentlyViewed'
import { cn } from '@/lib/cn'

interface PaletteResult {
  key: string
  section: 'Go to' | 'Recently viewed' | 'Issues'
  label: string
  sublabel?: string
  path: string
}

/**
 * Module 10's Cmd+K quick switcher - deliberately frontend-only, reusing already-cached
 * navigation/search rather than a new backend "global search" endpoint (that's Module 11's job:
 * "Notifications Center, Global Search & User Settings", not yet built). Three tiers: static
 * routes (mirrors Sidebar's own role-filtered nav list), recently-viewed tasks/projects (a
 * per-browser localStorage ring buffer - see `useRecentlyViewed.ts`), and a live issue search
 * reusing the exact same `GET /tasks/search` JQL `text ~` call `IssueLinksSection` already makes.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [recents, setRecents] = useState<RecentlyViewedItem[]>([])
  const navigate = useNavigate()
  const { hasRole } = useAuth()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setRecents(getRecentlyViewed())
    }
  }, [open])

  const debouncedQuery = useDebounce(query, 300)
  const issueSearchQuery = useMemo(() => {
    const term = debouncedQuery.trim()
    return term.length >= 2
      ? { jql: `text ~ '${term.replace(/'/g, '')}'`, page: 1, limit: 8 }
      : null
  }, [debouncedQuery])
  const { data: issueResults } = useTaskSearch(issueSearchQuery)

  const results = useMemo<PaletteResult[]>(() => {
    const term = query.trim().toLowerCase()

    const navResults: PaletteResult[] = NAV_ITEMS.filter(
      (item) => !item.roles || hasRole(...item.roles),
    )
      .filter((item) => !term || item.label.toLowerCase().includes(term))
      .map((item) => ({
        key: `nav-${item.to}`,
        section: 'Go to',
        label: item.label,
        path: item.to,
      }))

    const recentResults: PaletteResult[] = term
      ? []
      : recents.map((item) => ({
          key: `recent-${item.type}-${item.id}`,
          section: 'Recently viewed',
          label: item.label,
          sublabel: item.type === 'task' ? 'Issue' : 'Project',
          path: item.path,
        }))

    const issueResultsList: PaletteResult[] = (
      issueSearchQuery ? (issueResults?.data ?? []) : []
    ).map((task) => ({
      key: `issue-${task.id}`,
      section: 'Issues',
      label: task.title,
      sublabel: task.issueKey ?? undefined,
      path: `/tasks/${task.id}`,
    }))

    return [...navResults, ...recentResults, ...issueResultsList]
  }, [query, recents, hasRole, issueSearchQuery, issueResults])

  function activate(result: PaletteResult) {
    setOpen(false)
    navigate(result.path)
  }

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = results[selectedIndex]
      if (selected) activate(selected)
    }
  }

  const sections = ['Go to', 'Recently viewed', 'Issues'] as const

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg gap-0 p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogTitle className="sr-only">Quick switcher</DialogTitle>
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Go to a page, a recent item, or search issues…"
            aria-label="Quick switcher search"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            Esc
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto py-2">
          {results.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No results.</p>
          )}
          {sections.map((section) => {
            const items = results.filter((r) => r.section === section)
            if (items.length === 0) return null
            return (
              <div key={section} className="mb-1">
                <p className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {section}
                </p>
                {items.map((result) => {
                  const index = results.indexOf(result)
                  return (
                    <button
                      key={result.key}
                      type="button"
                      onMouseEnter={() => setSelectedIndex(index)}
                      onClick={() => activate(result)}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm',
                        index === selectedIndex ? 'bg-accent' : 'hover:bg-accent/60',
                      )}
                    >
                      <span className="truncate">{result.label}</span>
                      {result.sublabel && (
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                          {result.sublabel}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
