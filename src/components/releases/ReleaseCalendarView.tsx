import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { getMonthGridWeeks } from '@/lib/date'
import { STATUS_COLORS } from '@/lib/constants'
import { cn } from '@/lib/cn'
import type { Release } from '@/types/release.types'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export interface ReleaseCalendarViewProps {
  releases: Release[]
}

/** Module 2's Release Calendar (BRD: a calendar of upcoming/shipped releases) - a single-day
 * marker per release (unlike CalendarView's date-range sprint bars), keyed off whichever date is
 * currently meaningful: the actual ship date once released, else the planned target date. */
export function ReleaseCalendarView({ releases }: ReleaseCalendarViewProps) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const weeks = useMemo(() => getMonthGridWeeks(cursor.getFullYear(), cursor.getMonth()), [cursor])

  const releasesByDateKey = useMemo(() => {
    const map = new Map<string, Release[]>()
    for (const release of releases) {
      const effectiveDate = release.releasedAt ?? release.releaseDate
      if (!effectiveDate) continue
      const key = effectiveDate.slice(0, 10)
      const existing = map.get(key)
      if (existing) existing.push(release)
      else map.set(key, [release])
    }
    return map
  }, [releases])

  const hasAnyDated = releasesByDateKey.size > 0

  function changeMonth(offset: number) {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{MONTH_FORMATTER.format(cursor)}</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => changeMonth(-1)}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => changeMonth(1)}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!hasAnyDated ? (
        <EmptyState
          title="No dated releases"
          description="Releases with a target or actual ship date will show up here."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <div className="grid grid-cols-5 border-b bg-muted/50 text-xs font-medium text-muted-foreground">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="px-3 py-2">
                {label}
              </div>
            ))}
          </div>

          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-5 border-b last:border-b-0">
              {week.map((day, dayIndex) => {
                const dayReleases = releasesByDateKey.get(toDateKey(day)) ?? []
                return (
                  <div
                    key={dayIndex}
                    className={cn(
                      'min-h-[4rem] space-y-1 border-r px-2 py-1 text-xs last:border-r-0',
                      day.getMonth() !== cursor.getMonth() &&
                        'bg-muted/30 text-muted-foreground/50',
                    )}
                  >
                    <span className="text-muted-foreground">{day.getDate()}</span>
                    {dayReleases.map((release) => (
                      <div
                        key={release.id}
                        title={`${release.name} (${release.status})`}
                        className={cn(
                          'truncate rounded border px-1.5 py-0.5 font-medium',
                          STATUS_COLORS.release[release.status],
                        )}
                      >
                        {release.name}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
