import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { ErrorState } from '@/components/common/ErrorState'
import { Skeleton } from '@/components/common/Skeleton'
import { useTaskSummary } from '@/hooks/queries/useTasks'
import { toApiError } from '@/lib/error'

export interface TaskSummaryPanelProps {
  taskId: string
}

/** Module 10's deterministic (non-LLM) issue summary - a templated readout of real field values
 * and activity history, not an AI-generated paragraph (see the backend's `task-summary.util.ts`).
 * Collapsed by default so it doesn't compete for space with the rest of an already-dense detail
 * page; fetched only once expanded. */
export function TaskSummaryPanel({ taskId }: TaskSummaryPanelProps) {
  const [open, setOpen] = useState(false)
  const { data, isLoading, isError, error, refetch } = useTaskSummary(open ? taskId : undefined)

  return (
    <div className="rounded-xl border bg-card p-5 shadow-soft">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between text-sm font-medium"
        aria-expanded={open}
      >
        <span>Suggested summary</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="mt-3 space-y-2 text-sm">
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          )}
          {isError && (
            <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
          )}
          {data && (
            <>
              <p className="font-medium">{data.headline}</p>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                {data.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                A deterministic summary composed from this issue's real field values - not
                AI-generated.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
