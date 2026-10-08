import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { TaskDetailView } from './TaskDetailView'

/** Jira-style issue popup over the board: the whole task, without leaving the board. */
export function TaskQuickViewDialog({
  taskId,
  onClose,
}: {
  taskId: string | null
  onClose: () => void
}) {
  return (
    <Dialog open={!!taskId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[min(92vh,920px)] w-[calc(100vw-2rem)] max-w-6xl flex-col gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Issue details</DialogTitle>
        <DialogDescription className="sr-only">
          The selected issue. Press Escape to return to the board.
        </DialogDescription>
        {taskId && <TaskDetailView taskId={taskId} layout="panel" onDeleted={onClose} />}
      </DialogContent>
    </Dialog>
  )
}
