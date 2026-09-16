import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/common/EmptyState'
import { IssueTypeBadge } from '@/components/common/IssueTypeBadge'
import { useEpicProgress } from '@/hooks/queries/useTasks'
import type { Task } from '@/types/task.types'
import type { IssueTypeDefinition } from '@/types/issue-type.types'

function EpicCard({
  epic,
  issueTypeDefinitions,
}: {
  epic: Task
  issueTypeDefinitions?: IssueTypeDefinition[]
}) {
  const { data: progress } = useEpicProgress(epic.id)

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <IssueTypeBadge issueType={epic.issueType} definitions={issueTypeDefinitions} />
          <Link to={`/tasks/${epic.id}`} className="block font-medium hover:text-primary">
            {epic.title}
          </Link>
          {epic.issueKey && (
            <p className="font-mono text-xs text-muted-foreground">{epic.issueKey}</p>
          )}
        </div>
        {progress && (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {progress.doneCount}/{progress.linkedIssueCount} done
          </span>
        )}
      </div>

      <div className="space-y-1">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300 ease-smooth"
            style={{ width: `${progress?.progress ?? 0}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">{progress?.progress ?? 0}% complete</p>
      </div>
    </div>
  )
}

export function EpicsList({
  epics,
  issueTypeDefinitions,
}: {
  epics: Task[]
  issueTypeDefinitions?: IssueTypeDefinition[]
}) {
  if (epics.length === 0) {
    return (
      <EmptyState
        title="No epics yet"
        description='Create an issue with type "Epic" from New Task to group related work here.'
      />
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {epics.map((epic) => (
        <EpicCard key={epic.id} epic={epic} issueTypeDefinitions={issueTypeDefinitions} />
      ))}
    </div>
  )
}
