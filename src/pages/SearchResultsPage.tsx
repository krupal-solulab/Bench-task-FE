import { useEffect, useState } from 'react'
import { formatRelativeTime } from '@/lib/date'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/ui/input'
import { useGlobalSearch } from '@/hooks/queries/useGlobalSearch'
import { useAuth } from '@/hooks/useAuth'
import { toApiError } from '@/lib/error'

const RESULTS_LIMIT = 20

/** Module 11's Global Search results page - the "See all results" destination from the Topbar's
 * live-preview dropdown (GlobalSearchBar.tsx), showing a fuller list per category. */
export function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlQuery = searchParams.get('q') ?? ''
  const [input, setInput] = useState(urlQuery)
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const canOpenUsers = hasRole('Admin')

  useEffect(() => setInput(urlQuery), [urlQuery])

  const searchQuery =
    urlQuery.trim().length >= 2 ? { q: urlQuery.trim(), limit: RESULTS_LIMIT } : null
  const { data, isLoading, isError, error } = useGlobalSearch(searchQuery)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const term = input.trim()
    if (term.length < 2) return
    setSearchParams({ q: term })
  }

  const hasResults =
    !!data &&
    data.tasks.length + (data.comments?.length ?? 0) + data.projects.length + data.users.length > 0

  return (
    <div className="space-y-6">
      <PageHeader title="Search" description="Search across tasks, projects, and people" />

      <form onSubmit={handleSubmit} className="relative max-w-lg">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search tasks, projects, people…"
          aria-label="Search query"
          className="pl-9"
        />
      </form>

      {!searchQuery && (
        <EmptyState
          icon={Search}
          title="Type at least 2 characters to search"
          description="Search covers task titles, descriptions, and issue keys; project names; and people."
        />
      )}

      {searchQuery && isLoading && (
        <p className="py-8 text-center text-sm text-muted-foreground">Searching…</p>
      )}

      {searchQuery && isError && (
        <p className="py-8 text-center text-sm text-destructive">{toApiError(error).message}</p>
      )}

      {searchQuery && data && !hasResults && (
        <EmptyState title="No results" description={`Nothing matched "${urlQuery}".`} />
      )}

      {searchQuery && data && hasResults && (
        <div className="grid gap-6 md:grid-cols-3">
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Tasks {data.tasks.length > 0 && `(${data.tasks.length})`}
            </h2>
            {data.tasks.length === 0 && (
              <p className="text-sm text-muted-foreground">No matches.</p>
            )}
            {data.tasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => navigate(`/tasks/${task.id}`)}
                className="flex w-full flex-col items-start gap-0.5 rounded-lg border bg-card p-3 text-left shadow-soft transition-colors hover:bg-accent/40"
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{task.title}</span>
                  {task.issueKey && (
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {task.issueKey}
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {task.project?.name ?? 'No project'} · {task.status}
                </span>
              </button>
            ))}
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Projects {data.projects.length > 0 && `(${data.projects.length})`}
            </h2>
            {data.projects.length === 0 && (
              <p className="text-sm text-muted-foreground">No matches.</p>
            )}
            {data.projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => navigate(`/projects/${project.id}`)}
                className="flex w-full items-center justify-between gap-2 rounded-lg border bg-card p-3 text-left shadow-soft transition-colors hover:bg-accent/40"
              >
                <span className="truncate text-sm font-medium">{project.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{project.status}</span>
              </button>
            ))}
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              People {data.users.length > 0 && `(${data.users.length})`}
            </h2>
            {data.users.length === 0 && (
              <p className="text-sm text-muted-foreground">No matches.</p>
            )}
            {data.users.map((user) => (
              <button
                key={user.id}
                type="button"
                disabled={!canOpenUsers}
                onClick={() => navigate(`/admin/users?search=${encodeURIComponent(user.email)}`)}
                className="flex w-full flex-col items-start gap-0.5 rounded-lg border bg-card p-3 text-left shadow-soft transition-colors enabled:hover:bg-accent/40 disabled:cursor-default"
              >
                <span className="truncate text-sm font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </button>
            ))}
          </section>
        </div>
      )}

      {searchQuery && data && (data.comments?.length ?? 0) > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Comments ({data.comments!.length})
          </h2>
          {data.comments!.map((comment) => (
            <button
              key={comment.id}
              type="button"
              onClick={() => navigate(`/tasks/${comment.task.id}`)}
              className="flex w-full flex-col items-start gap-0.5 rounded-lg border bg-card p-3 text-left shadow-soft transition-colors hover:bg-accent/40"
            >
              <span className="text-xs text-muted-foreground">
                {comment.task.issueKey ? `${comment.task.issueKey} · ` : ''}
                {comment.task.title}
                {comment.author ? ` · ${comment.author.name}` : ''} ·{' '}
                {formatRelativeTime(comment.createdAt)}
              </span>
              <span className="text-sm">{comment.snippet}</span>
            </button>
          ))}
        </section>
      )}
    </div>
  )
}
