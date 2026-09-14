import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { assignLanes, getMonthGridWeeks } from '@/lib/date'
import { cn } from '@/lib/cn'
import type { Sprint } from '@/types/sprint.types'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

const LANE_COLORS = [
  'bg-blue-500 hover:bg-blue-600',
  'bg-violet-500 hover:bg-violet-600',
  'bg-amber-500 hover:bg-amber-600',
  'bg-emerald-500 hover:bg-emerald-600',
  'bg-rose-500 hover:bg-rose-600',
]

const MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Where (and how wide) a date range's bar segment falls within one Mon-Fri week row. */
function getWeekSpan(
  weekKeys: string[],
  startKey: string,
  endKey: string,
): { startCol: number; span: number } | null {
  if (endKey < weekKeys[0]! || startKey > weekKeys[weekKeys.length - 1]!) return null
  const rawStartCol = weekKeys.findIndex((k) => k >= startKey)
  const startCol = rawStartCol === -1 ? 0 : rawStartCol
  let endCol = weekKeys.length - 1
  while (endCol > startCol && weekKeys[endCol]! > endKey) endCol--
  return { startCol, span: endCol - startCol + 1 }
}

export interface CalendarViewProps {
  sprints: Sprint[]
  projectId: string
}

export function CalendarView({ sprints, projectId }: CalendarViewProps) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const weeks = useMemo(() => getMonthGridWeeks(cursor.getFullYear(), cursor.getMonth()), [cursor])
  const weekKeyRows = useMemo(() => weeks.map((week) => week.map(toDateKey)), [weeks])
  const gridStartKey = weekKeyRows[0]![0]!
  const gridEndKey = weekKeyRows[weekKeyRows.length - 1]![4]!

  const visibleSprints = useMemo(() => {
    return sprints
      .map((sprint) => ({
        ...sprint,
        startDate: sprint.startDate.slice(0, 10),
        endDate: sprint.endDate.slice(0, 10),
      }))
      .filter((sprint) => sprint.endDate >= gridStartKey && sprint.startDate <= gridEndKey)
  }, [sprints, gridStartKey, gridEndKey])

  const lanes = useMemo(() => assignLanes(visibleSprints), [visibleSprints])
  const laneCount = Math.max(1, ...lanes.map((l) => l.lane + 1))

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

      {visibleSprints.length === 0 ? (
        <EmptyState title="No sprints this month" description="Create a sprint to see it here." />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <div className="grid grid-cols-5 border-b bg-muted/50 text-xs font-medium text-muted-foreground">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="px-3 py-2">
                {label}
              </div>
            ))}
          </div>

          {weeks.map((week, weekIndex) => {
            const weekKeys = weekKeyRows[weekIndex]!
            const segments = lanes
              .map(({ item: sprint, lane }) => {
                const span = getWeekSpan(weekKeys, sprint.startDate, sprint.endDate)
                return span ? { sprint, lane, ...span } : null
              })
              .filter((s): s is NonNullable<typeof s> => s !== null)

            return (
              <div key={weekIndex} className="grid grid-cols-5 border-b last:border-b-0">
                {week.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className={cn(
                      'min-h-[2.5rem] border-r px-2 py-1 text-xs text-muted-foreground last:border-r-0',
                      day.getMonth() !== cursor.getMonth() &&
                        'bg-muted/30 text-muted-foreground/50',
                    )}
                  >
                    {day.getDate()}
                  </div>
                ))}

                <div
                  className="col-span-5 grid grid-cols-5 gap-y-1 px-2 pb-2"
                  style={{ minHeight: laneCount * 1.75 + 'rem' }}
                >
                  {segments.map(({ sprint, lane, startCol, span }) => (
                    <Link
                      key={sprint.id}
                      to={`/projects/${projectId}?tab=backlog&sprint=${sprint.id}`}
                      title={`${sprint.name} (${sprint.status})`}
                      className={cn(
                        'truncate rounded px-2 py-1 text-xs font-medium text-white shadow-sm transition-colors',
                        LANE_COLORS[lane % LANE_COLORS.length],
                      )}
                      style={{
                        gridColumnStart: startCol + 1,
                        gridColumnEnd: `span ${span}`,
                        gridRow: lane + 1,
                      }}
                    >
                      {sprint.name}
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
