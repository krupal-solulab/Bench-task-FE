import { useMemo } from 'react'
import { matchPath, useLocation } from 'react-router-dom'
import { useTask } from '@/hooks/queries/useTasks'
import { useProjectWorkflow } from '@/hooks/queries/useProjects'
import {
  useUnwatchTask,
  useUpdateAnyTaskAssignee,
  useUpdateAnyTaskStatus,
  useWatchTask,
} from '@/hooks/mutations/useTaskMutations'
import { useAuth } from '@/hooks/useAuth'
import { DEFAULT_WORKFLOW } from '@/lib/status-transitions'

export interface QuickAction {
  key: string
  label: string
  sublabel?: string
  /** Resolves with the toast message to show on success. */
  run: () => Promise<string>
}

/**
 * Module 10 gap-closure: contextual quick actions for the command palette - when the current page
 * is an issue, the palette offers the most common one-step changes for it. Every action goes
 * through the same mutations the issue page itself uses, so permissions and validation are
 * enforced exactly as before (a refused action surfaces the server's message). Transitions that
 * need approval are left to the issue page's own status control, which runs that flow.
 */
export function useTaskQuickActions(): QuickAction[] {
  const location = useLocation()
  const taskId = matchPath('/tasks/:id', location.pathname)?.params.id
  const { user } = useAuth()
  const { data: task } = useTask(taskId)
  const { data: workflow } = useProjectWorkflow(task?.project.id, task?.issueType)
  const assign = useUpdateAnyTaskAssignee()
  const updateStatus = useUpdateAnyTaskStatus()
  const watch = useWatchTask(taskId ?? '')
  const unwatch = useUnwatchTask(taskId ?? '')

  return useMemo(() => {
    if (!task || !user) return []
    const subject = task.issueKey ?? 'this issue'
    const actions: QuickAction[] = []

    if (task.assignee?.id !== user.id) {
      actions.push({
        key: 'assign-me',
        label: 'Assign to me',
        sublabel: subject,
        run: async () => {
          await assign.mutateAsync({ id: task.id, assignee: user.id })
          return `${subject} assigned to you`
        },
      })
    }

    const isWatching = task.watcherIds?.some((w) => w.id === user.id) ?? false
    actions.push(
      isWatching
        ? {
            key: 'unwatch',
            label: 'Stop watching',
            sublabel: subject,
            run: async () => {
              await unwatch.mutateAsync()
              return `Stopped watching ${subject}`
            },
          }
        : {
            key: 'watch',
            label: 'Watch',
            sublabel: subject,
            run: async () => {
              await watch.mutateAsync()
              return `Watching ${subject}`
            },
          },
    )

    const transitions = (workflow ?? DEFAULT_WORKFLOW).transitions.filter(
      (t) => t.from === task.status && !t.requiresApproval,
    )
    for (const transition of transitions) {
      actions.push({
        key: `status-${transition.to}`,
        label: `Move to ${transition.to}`,
        sublabel: subject,
        run: async () => {
          await updateStatus.mutateAsync({ id: task.id, status: transition.to })
          return `${subject} moved to ${transition.to}`
        },
      })
    }

    actions.push({
      key: 'copy-link',
      label: 'Copy link to this issue',
      sublabel: subject,
      run: async () => {
        await navigator.clipboard.writeText(`${window.location.origin}/tasks/${task.id}`)
        return 'Link copied'
      },
    })
    return actions
  }, [task, user, workflow, assign, updateStatus, watch, unwatch])
}
