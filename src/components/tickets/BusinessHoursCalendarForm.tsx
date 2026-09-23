import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { CardSkeleton } from '@/components/common/Skeleton'
import { useBusinessHoursCalendar } from '@/hooks/queries/useTickets'
import { useUpdateBusinessHoursCalendar } from '@/hooks/mutations/useTicketMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import type { BusinessHoursCalendar } from '@/types/ticket.types'

export interface BusinessHoursCalendarFormProps {
  canManage: boolean
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function defaultCalendar(): BusinessHoursCalendar {
  return {
    workingDays: [1, 2, 3, 4, 5],
    workingHours: { start: '09:00', end: '18:00' },
    holidays: [],
  }
}

/** BRD 3.4's Business Hours calendar - anchors the SLA breach calculation's "count only business
 * hours" logic. A ticket's org has no calendar (null) by default, meaning 24/7 - opting in doesn't
 * change anything until this form is saved with at least one working day configured. */
export function BusinessHoursCalendarForm({ canManage }: BusinessHoursCalendarFormProps) {
  const { data, isLoading } = useBusinessHoursCalendar()
  const updateCalendar = useUpdateBusinessHoursCalendar()
  const { showToast } = useToast()
  const [enabled, setEnabled] = useState(false)
  const [calendar, setCalendar] = useState<BusinessHoursCalendar>(defaultCalendar())
  const [newHoliday, setNewHoliday] = useState('')

  useEffect(() => {
    if (data === undefined) return
    setEnabled(data !== null)
    if (data) setCalendar(data)
  }, [data])

  if (isLoading) return <CardSkeleton />

  const canSave = canManage && (!enabled || calendar.workingDays.length > 0)

  function toggleDay(day: number) {
    const workingDays = calendar.workingDays.includes(day)
      ? calendar.workingDays.filter((d) => d !== day)
      : [...calendar.workingDays, day].sort()
    setCalendar({ ...calendar, workingDays })
  }

  function addHoliday() {
    if (!newHoliday.trim() || calendar.holidays.includes(newHoliday)) return
    setCalendar({ ...calendar, holidays: [...calendar.holidays, newHoliday] })
    setNewHoliday('')
  }

  function removeHoliday(date: string) {
    setCalendar({ ...calendar, holidays: calendar.holidays.filter((h) => h !== date) })
  }

  async function handleSave() {
    if (!enabled) {
      showToast({
        title: 'Business hours disabled',
        description:
          'SLA/automation timing will use 24/7 wall-clock time. Enable to save a calendar.',
        variant: 'default',
      })
      return
    }
    try {
      const saved = await updateCalendar.mutateAsync(calendar)
      setCalendar(saved)
      showToast({ title: 'Business hours calendar updated', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not update business hours calendar',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  if (!canManage) {
    return (
      <div className="space-y-2">
        <h3 className="font-medium">Business hours</h3>
        {!enabled ? (
          <p className="text-sm text-muted-foreground">
            No business hours configured - SLA timing runs 24/7.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {calendar.workingDays.map((d) => WEEKDAY_LABELS[d]).join(', ')},{' '}
            {calendar.workingHours.start}–{calendar.workingHours.end}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium">Business hours</h3>
        <p className="text-sm text-muted-foreground">
          SLA and scheduled-automation timing counts only time inside these hours. Disabled means
          24/7 (the default for every org).
        </p>
      </div>

      <label className="flex items-center gap-1.5 text-sm">
        <Checkbox
          aria-label="Enable business hours"
          checked={enabled}
          onCheckedChange={(checked) => setEnabled(checked === true)}
        />
        Restrict SLA/automation timing to business hours
      </label>

      {enabled && (
        <div className="space-y-4 rounded-md border p-3">
          <div className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Working days
            </span>
            <div className="flex flex-wrap gap-3">
              {WEEKDAY_LABELS.map((label, day) => (
                <label key={day} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    aria-label={label}
                    checked={calendar.workingDays.includes(day)}
                    onCheckedChange={() => toggleDay(day)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Working hours</span>
            <Input
              aria-label="Working hours start"
              type="time"
              value={calendar.workingHours.start}
              onChange={(e) =>
                setCalendar({
                  ...calendar,
                  workingHours: { ...calendar.workingHours, start: e.target.value },
                })
              }
              className="w-32"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <Input
              aria-label="Working hours end"
              type="time"
              value={calendar.workingHours.end}
              onChange={(e) =>
                setCalendar({
                  ...calendar,
                  workingHours: { ...calendar.workingHours, end: e.target.value },
                })
              }
              className="w-32"
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Holidays
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {calendar.holidays.map((date) => (
                <span
                  key={date}
                  className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs"
                >
                  {date}
                  <button
                    type="button"
                    onClick={() => removeHoliday(date)}
                    aria-label={`Remove holiday ${date}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                aria-label="Add holiday"
                type="date"
                value={newHoliday}
                onChange={(e) => setNewHoliday(e.target.value)}
                className="w-40"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addHoliday}
                className="gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end border-t pt-4">
        <Button
          type="button"
          onClick={() => void handleSave()}
          loading={updateCalendar.isPending}
          disabled={!canSave}
        >
          Save business hours
        </Button>
      </div>
    </div>
  )
}
