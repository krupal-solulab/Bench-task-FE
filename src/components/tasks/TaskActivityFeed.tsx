import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, History } from 'lucide-react'
import { Spinner } from '@/components/common/Spinner'
import { ErrorState } from '@/components/common/ErrorState'
import { useTaskActivity } from '@/hooks/queries/useTasks'
import { formatDateTime } from '@/lib/date'
import { toApiError } from '@/lib/error'

const ACTION_LABELS: Record<string, string> = {
  created: 'created the task',
  status_changed: 'changed status',
  reassigned: 'reassigned the task',
  priority_changed: 'changed priority',
  due_date_changed: 'changed the due date',
  updated: 'updated the task',
  deleted: 'deleted the task',
  sprint_assigned: 'moved the task into a sprint',
  sprint_removed: 'moved the task back to the backlog',
  commented: 'commented',
}

export function TaskActivityFeed({ taskId }: { taskId: string }) {
  const [open, setOpen] = useState(false)
  const { data, isLoading, isError, error, refetch } = useTaskActivity(
    open ? taskId : undefined,
    1,
    20,
  )

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-soft">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium transition-colors hover:bg-accent/40"
        aria-expanded={open}
      >
        <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        Activity
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="ml-auto"
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t px-4 py-3">
              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner /> Loading activity…
                </div>
              )}
              {isError && (
                <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
              )}
              {!isLoading && !isError && data?.data.length === 0 && (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              )}
              {!isLoading &&
                !isError &&
                data?.data.map((entry) => (
                  <div key={entry.id} className="flex gap-2 text-sm">
                    <span className="shrink-0 text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </span>
                    <span>
                      <span className="font-medium">{entry.actor.name}</span>{' '}
                      {ACTION_LABELS[entry.action] ?? entry.action}
                      {entry.from && entry.to ? ` (${entry.from} → ${entry.to})` : ''}
                      {entry.viaAutomationRule && (
                        <span className="text-muted-foreground">
                          {' '}
                          · via automation: {entry.viaAutomationRule}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
