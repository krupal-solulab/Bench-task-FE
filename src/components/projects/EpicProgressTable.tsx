import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { TableSkeleton } from '@/components/common/Skeleton'
import { useEpicProgressReport } from '@/hooks/queries/useProjects'
import { toApiError } from '@/lib/error'

export interface EpicProgressTableProps {
  projectId: string
}

/** Every Epic in the project with its linked-issue completion % (Search/Dashboards v2's bulk
 * "epic-progress report"), in the project's existing Reports tab alongside Velocity/Burndown -
 * a single-fetch summary table, distinct from the per-epic progress bars already shown in the
 * Epics tab (EpicsList, which fetches one epic's progress at a time as a detail view). */
export function EpicProgressTable({ projectId }: EpicProgressTableProps) {
  const { data, isLoading, isError, error, refetch } = useEpicProgressReport(projectId)

  return (
    <div className="space-y-2 rounded-xl border bg-card p-4 shadow-soft">
      <h3 className="text-sm font-semibold">Epic progress</h3>
      {isLoading && <TableSkeleton rows={3} columns={3} />}
      {isError && <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />}
      {!isLoading && !isError && data?.length === 0 && (
        <EmptyState title="No epics yet" description="Create an Epic to see its progress here." />
      )}
      {!isLoading && !isError && data && data.length > 0 && (
        <ul className="divide-y">
          {data.map((epic) => (
            <li key={epic.epicId} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                <Link
                  to={`/tasks/${epic.epicId}`}
                  className="truncate font-medium transition-colors hover:text-primary"
                >
                  {epic.title}
                </Link>
                {epic.issueKey && (
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {epic.issueKey}
                  </p>
                )}
              </div>
              <div className="flex w-40 shrink-0 items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300 ease-smooth"
                    style={{ width: `${epic.progress}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">
                  {epic.doneCount}/{epic.linkedIssueCount} ({epic.progress}%)
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
