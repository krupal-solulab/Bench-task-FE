import { Button } from '@/components/common/Button'
import { useSprintPlanningSuggestion } from '@/hooks/queries/useSprints'
import { useBulkMoveSprint } from '@/hooks/mutations/useTaskMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import type { Sprint } from '@/types/sprint.types'

export interface SprintPlanningSuggestionProps {
  projectId: string
  sprint: Sprint
}

const BASIS_LABEL: Record<'capacity' | 'velocity' | 'none', string> = {
  capacity: "this sprint's capacity",
  velocity: 'your recent average velocity',
  none: '',
}

/** Module 10's deterministic (non-LLM) sprint-planning suggestion, shown only for a Planned
 * sprint - which ranked backlog items would fit, based on capacity or recent velocity. Renders
 * nothing when there's no signal to base a suggestion on (a brand-new project with neither a set
 * capacity nor any completed-sprint history). */
export function SprintPlanningSuggestion({ projectId, sprint }: SprintPlanningSuggestionProps) {
  const { data, isLoading } = useSprintPlanningSuggestion(projectId, sprint.id)
  const bulkMoveSprint = useBulkMoveSprint()
  const { showToast } = useToast()

  if (isLoading || !data || data.basis === 'none' || data.suggestedTaskIds.length === 0) {
    return null
  }

  async function handleAddSuggested() {
    if (!data) return
    try {
      await bulkMoveSprint.mutateAsync({ taskIds: data.suggestedTaskIds, sprintId: sprint.id })
      showToast({
        title: `Added ${data.suggestedCount} suggested issue(s) to ${sprint.name}`,
        variant: 'success',
      })
    } catch (err) {
      showToast({
        title: 'Could not add suggested issues',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-xs">
      <p className="text-muted-foreground">
        Suggested scope: {data.suggestedCount} issue{data.suggestedCount === 1 ? '' : 's'}
        {data.suggestedPoints > 0 && ` (${data.suggestedPoints} pts)`}, based on{' '}
        {BASIS_LABEL[data.basis]}.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void handleAddSuggested()}
        loading={bulkMoveSprint.isPending}
      >
        Add suggested to sprint
      </Button>
    </div>
  )
}
