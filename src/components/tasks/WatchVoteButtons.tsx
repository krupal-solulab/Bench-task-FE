import { Eye, EyeOff, Star } from 'lucide-react'
import { Button } from '@/components/common/Button'
import {
  useUnvoteTask,
  useUnwatchTask,
  useVoteTask,
  useWatchTask,
} from '@/hooks/mutations/useTaskMutations'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import type { Task } from '@/types/task.types'

/** Module 7's Watchers/Voting - self-service toggles, computed client-side from the current
 * user's id against the task's already-populated watcherIds/voterIds (same "compute it from data
 * already on the page" convention used elsewhere in this codebase, e.g. myGrant on ProjectDetailPage). */
export function WatchVoteButtons({ task }: { task: Task }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const watchTask = useWatchTask(task.id)
  const unwatchTask = useUnwatchTask(task.id)
  const voteTask = useVoteTask(task.id)
  const unvoteTask = useUnvoteTask(task.id)

  const isWatching = !!user && task.watcherIds.some((u) => u.id === user.id)
  const hasVoted = !!user && task.voterIds.some((u) => u.id === user.id)

  async function toggleWatch() {
    try {
      if (isWatching) await unwatchTask.mutateAsync()
      else await watchTask.mutateAsync()
    } catch (err) {
      showToast({
        title: 'Could not update watch status',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function toggleVote() {
    try {
      if (hasVoted) await unvoteTask.mutateAsync()
      else await voteTask.mutateAsync()
    } catch (err) {
      showToast({
        title: 'Could not update your vote',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        className="gap-1"
        loading={watchTask.isPending || unwatchTask.isPending}
        onClick={() => void toggleWatch()}
        title={isWatching ? 'Stop watching' : 'Start watching'}
      >
        {isWatching ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        {task.watcherIds.length}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-1"
        loading={voteTask.isPending || unvoteTask.isPending}
        onClick={() => void toggleVote()}
        title={hasVoted ? 'Remove your vote' : 'Vote for this issue'}
      >
        <Star className={hasVoted ? 'h-3.5 w-3.5 fill-current' : 'h-3.5 w-3.5'} />
        {task.voterIds.length}
      </Button>
    </div>
  )
}
