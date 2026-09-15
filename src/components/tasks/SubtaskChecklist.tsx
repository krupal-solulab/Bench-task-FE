import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Input } from '@/components/ui/input'
import { useProjectTasks } from '@/hooks/queries/useProjects'
import { useCreateTask } from '@/hooks/mutations/useTaskMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'

export interface SubtaskChecklistProps {
  parentTaskId: string
  projectId: string
  canManage: boolean
}

/** A checklist-style list of a Story/Task/Bug's Sub-tasks, with a quick-add row. Sub-tasks never
 * appear on the Board/Backlog independently - this is their only listing surface. */
export function SubtaskChecklist({ parentTaskId, projectId, canManage }: SubtaskChecklistProps) {
  const [title, setTitle] = useState('')
  const { data, isLoading } = useProjectTasks(projectId, {
    page: 1,
    limit: 100,
    parent: parentTaskId,
  })
  const createTask = useCreateTask()
  const { showToast } = useToast()

  const subtasks = data?.data ?? []
  const doneCount = subtasks.filter((t) => t.statusCategory === 'Done').length

  async function handleAdd() {
    const trimmed = title.trim()
    if (trimmed.length < 3) return
    try {
      await createTask.mutateAsync({
        title: trimmed,
        description: '',
        project: projectId,
        priority: 'P2',
        issueType: 'Sub-task',
        parent: parentTaskId,
      })
      setTitle('')
    } catch (err) {
      showToast({
        title: 'Could not add sub-task',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  if (isLoading) return null

  return (
    <div className="rounded-xl border bg-card p-5 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium">Sub-tasks</h3>
        {subtasks.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {doneCount}/{subtasks.length} done
          </span>
        )}
      </div>

      {subtasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sub-tasks yet.</p>
      ) : (
        <ul className="space-y-2">
          {subtasks.map((subtask) => (
            <li key={subtask.id} className="flex items-center justify-between gap-3 text-sm">
              <Link to={`/tasks/${subtask.id}`} className="truncate hover:text-primary">
                {subtask.issueKey && (
                  <span className="mr-1.5 font-mono text-xs text-muted-foreground">
                    {subtask.issueKey}
                  </span>
                )}
                {subtask.title}
              </Link>
              <StatusBadge
                status={subtask.status}
                kind="task"
                category={subtask.statusCategory}
                className="shrink-0"
              />
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <div className="mt-4 flex gap-2 border-t pt-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a sub-task…"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void handleAdd()
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleAdd()}
            loading={createTask.isPending}
            disabled={title.trim().length < 3}
          >
            Add
          </Button>
        </div>
      )}
    </div>
  )
}
