import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useGlobalSearch } from '@/hooks/queries/useGlobalSearch'
import { useDebounce } from '@/hooks/useDebounce'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/cn'

/** Module 11's Global Search bar - a live preview dropdown (top 5 per category, matching the
 * backend's default `limit`) embedded in the Topbar, with "See all results" handing off to the
 * full `/search` results page. Deliberately separate from Module 10's Cmd+K CommandPalette, which
 * only ever searched issues/nav/recents and explicitly deferred true global search to this
 * module. */
export function GlobalSearchBar() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const canOpenUsers = hasRole('Admin')

  const debouncedQuery = useDebounce(query, 300)
  const searchQuery = useMemo(() => {
    const term = debouncedQuery.trim()
    return term.length >= 2 ? { q: term, limit: 5 } : null
  }, [debouncedQuery])
  const { data } = useGlobalSearch(searchQuery)

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  function goToResults() {
    const term = query.trim()
    if (term.length < 2) return
    setOpen(false)
    navigate(`/search?q=${encodeURIComponent(term)}`)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      goToResults()
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const hasResults = !!data && data.tasks.length + data.projects.length + data.users.length > 0
  const showDropdown = open && !!searchQuery

  return (
    <div ref={containerRef} className="relative hidden w-full max-w-sm sm:block">
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search tasks, projects, people…"
        aria-label="Global search"
        className="h-9 w-full rounded-md border bg-background pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
      />

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-96 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
          {!data && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">Searching…</p>
          )}

          {data && !hasResults && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">No results.</p>
          )}

          {data && data.tasks.length > 0 && (
            <div className="mb-1">
              <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Tasks
              </p>
              {data.tasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    navigate(`/tasks/${task.id}`)
                  }}
                  className="flex w-full items-center justify-between gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <span className="truncate">{task.title}</span>
                  {task.issueKey && (
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {task.issueKey}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {data && data.projects.length > 0 && (
            <div className="mb-1">
              <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Projects
              </p>
              {data.projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    navigate(`/projects/${project.id}`)
                  }}
                  className="flex w-full items-center justify-between gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <span className="truncate">{project.name}</span>
                </button>
              ))}
            </div>
          )}

          {data && data.users.length > 0 && (
            <div className="mb-1">
              <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                People
              </p>
              {data.users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  disabled={!canOpenUsers}
                  onClick={() => {
                    setOpen(false)
                    navigate(`/admin/users?search=${encodeURIComponent(user.email)}`)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-sm px-3 py-2 text-left text-sm',
                    canOpenUsers ? 'hover:bg-accent' : 'cursor-default',
                  )}
                >
                  <span className="truncate">{user.name}</span>
                  <span className="shrink-0 truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </button>
              ))}
            </div>
          )}

          {hasResults && (
            <button
              type="button"
              onClick={goToResults}
              className="mt-1 w-full rounded-sm px-3 py-2 text-center text-xs font-medium text-primary hover:bg-accent"
            >
              See all results
            </button>
          )}
        </div>
      )}
    </div>
  )
}
