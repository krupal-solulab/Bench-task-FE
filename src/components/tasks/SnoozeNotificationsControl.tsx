import { BellOff } from 'lucide-react'
import { Button } from '@/components/common/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNotificationSnoozes } from '@/hooks/queries/useNotifications'
import { useSnoozeTask, useUnsnoozeTask } from '@/hooks/mutations/useNotificationMutations'
import { useToast } from '@/hooks/useToast'
import { formatDateTime } from '@/lib/date'
import { toApiError } from '@/lib/error'

const HOUR = 60 * 60 * 1000

/** Snooze choices, computed when picked (so "tomorrow" is relative to the click). */
const CHOICES: Array<{ label: string; until: () => Date }> = [
  { label: '1 hour', until: () => new Date(Date.now() + HOUR) },
  {
    label: 'Until tomorrow 9:00',
    until: () => {
      const d = new Date()
      d.setDate(d.getDate() + 1)
      d.setHours(9, 0, 0, 0)
      return d
    },
  },
  { label: '1 week', until: () => new Date(Date.now() + 7 * 24 * HOUR) },
]

/** Module 11 gap-closure - snooze this issue's notifications for yourself only. While snoozed
 * they're hidden from your list and unread count; they come back when the snooze ends. */
export function SnoozeNotificationsControl({ taskId }: { taskId: string }) {
  const { data: snoozes } = useNotificationSnoozes()
  const snooze = useSnoozeTask()
  const unsnooze = useUnsnoozeTask()
  const { showToast } = useToast()
  const active = snoozes?.find((s) => s.taskId === taskId)

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action()
      showToast({ title: success, variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not update the snooze',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  if (active) {
    return (
      <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <BellOff className="h-3.5 w-3.5" aria-hidden="true" />
        Notifications snoozed until {formatDateTime(active.until)}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void run(() => unsnooze.mutateAsync(taskId), 'Notifications resumed')}
        >
          Resume
        </Button>
      </span>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <BellOff className="h-3.5 w-3.5" aria-hidden="true" /> Snooze notifications
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {CHOICES.map((choice) => (
          <DropdownMenuItem
            key={choice.label}
            onSelect={() =>
              void run(
                () => snooze.mutateAsync({ taskId, until: choice.until().toISOString() }),
                `Notifications for this issue snoozed (${choice.label.toLowerCase()})`,
              )
            }
          >
            {choice.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
