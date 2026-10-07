import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/cn'
import { formatDate, formatDayLabel } from '@/lib/date'

export interface DatePickerProps {
  value: string | null | undefined
  onChange: (value: string | null) => void
  id?: string
  label?: string
  min?: string
  max?: string
  className?: string
  disabled?: boolean
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = Array.from({ length: 12 }, (_, m) =>
  new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(2000, m, 1)),
)
const monthYearFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })
/** 'YYYY-MM-DD' (or a full ISO timestamp, of which only the calendar date counts) -> local Date. */
function parseIsoDate(value: string | null | undefined): Date | null {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

/** Same day-of-month in another month, clamped (Jan 31 + 1 month -> Feb 28/29). */
function addMonths(date: Date, months: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay))
}

/** Always 6 whole weeks (42 days, Sunday-first), so the popover never changes height or scrolls. */
function getMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const start = addDays(first, -first.getDay())
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

/**
 * A themed calendar in a popover. Replaces the native date input, whose browser-drawn calendar
 * ignored the app's dark mode and, in some browsers, scrolled vertically. Value in and out stays
 * a plain 'YYYY-MM-DD' string (null when cleared), so call sites are unchanged.
 */
export function DatePicker({
  value,
  onChange,
  id,
  label,
  min,
  max,
  className,
  disabled,
}: DatePickerProps) {
  const selected = parseIsoDate(value)
  const minIso = min?.slice(0, 10)
  const maxIso = max?.slice(0, 10)

  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'days' | 'months'>('days')
  const [focused, setFocused] = useState<Date>(() => selected ?? new Date())
  const [viewYear, setViewYear] = useState(focused.getFullYear())
  const gridRef = useRef<HTMLDivElement>(null)
  const moveFocusRef = useRef(false)

  const today = new Date()
  const isDisabledDay = (date: Date) => {
    const iso = toIsoDate(date)
    return (!!minIso && iso < minIso) || (!!maxIso && iso > maxIso)
  }

  function handleOpenChange(next: boolean) {
    if (next) {
      const start = selected ?? today
      setFocused(start)
      setViewYear(start.getFullYear())
      setView('days')
    }
    setOpen(next)
  }

  function select(date: Date | null) {
    onChange(date ? toIsoDate(date) : null)
    setOpen(false)
  }

  function focusDay(date: Date) {
    moveFocusRef.current = true
    setFocused(date)
  }

  // Keep DOM focus on the roving day cell after keyboard navigation (incl. across months).
  useEffect(() => {
    if (!moveFocusRef.current) return
    moveFocusRef.current = false
    gridRef.current?.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus()
  }, [focused])

  function handleGridKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      PageUp: () => addMonths(focused, e.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focused, e.shiftKey ? 12 : 1),
      Home: () => addDays(focused, -focused.getDay()),
      End: () => addDays(focused, 6 - focused.getDay()),
    }
    const move = moves[e.key]
    if (!move) return
    e.preventDefault()
    focusDay(move())
  }

  const viewMonth = focused.getMonth()
  const days = getMonthGrid(focused.getFullYear(), viewMonth)
  const todayDisabled = isDisabledDay(today)

  const isMonthDisabled = (year: number, month: number) =>
    (!!minIso && toIsoDate(new Date(year, month + 1, 0)) < minIso) ||
    (!!maxIso && toIsoDate(new Date(year, month, 1)) > maxIso)

  const navButton =
    'inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors ' +
    'hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          aria-label={label}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm',
            'ring-offset-background transition-colors hover:border-primary/40 focus-visible:outline-none',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:border-primary/60',
            className,
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected ? formatDate(toIsoDate(selected)) : 'Select date'}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-auto p-3"
        aria-label={label ? `${label} calendar` : 'Calendar'}
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          gridRef.current?.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus()
        }}
      >
        {view === 'days' ? (
          <>
            <div className="mb-2 flex items-center justify-between gap-1">
              <button
                type="button"
                className={navButton}
                aria-label="Previous month"
                onClick={() => setFocused(addMonths(focused, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Choose month and year"
                className="rounded-md px-2 py-1 text-sm font-semibold transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  setViewYear(focused.getFullYear())
                  setView('months')
                }}
              >
                {monthYearFormatter.format(focused)}
              </button>
              <button
                type="button"
                className={navButton}
                aria-label="Next month"
                onClick={() => setFocused(addMonths(focused, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-0.5" role="presentation">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  aria-hidden
                  className="flex h-8 w-9 items-center justify-center text-xs font-medium text-muted-foreground"
                >
                  {d}
                </div>
              ))}
            </div>
            <div
              ref={gridRef}
              role="grid"
              className="grid grid-cols-7 gap-0.5"
              onKeyDown={handleGridKeyDown}
            >
              {days.map((day) => {
                const iso = toIsoDate(day)
                const isSelected = !!selected && iso === toIsoDate(selected)
                const isToday = iso === toIsoDate(today)
                const isFocused = iso === toIsoDate(focused)
                const outside = day.getMonth() !== viewMonth
                const dayDisabled = isDisabledDay(day)
                return (
                  <button
                    key={iso}
                    type="button"
                    role="gridcell"
                    tabIndex={isFocused ? 0 : -1}
                    aria-label={formatDayLabel(day)}
                    aria-selected={isSelected}
                    aria-current={isToday ? 'date' : undefined}
                    disabled={dayDisabled}
                    onClick={() => select(day)}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-md text-sm tabular-nums transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      'disabled:cursor-not-allowed disabled:opacity-30',
                      outside ? 'text-muted-foreground/60' : 'text-foreground',
                      !isSelected && 'hover:bg-accent hover:text-accent-foreground',
                      isToday &&
                        !isSelected &&
                        'font-semibold text-primary ring-1 ring-inset ring-primary/40',
                      isSelected &&
                        'bg-primary font-semibold text-primary-foreground hover:bg-primary/90',
                    )}
                  >
                    {day.getDate()}
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <div className="w-[16.5rem]">
            <div className="mb-2 flex items-center justify-between gap-1">
              <button
                type="button"
                className={navButton}
                aria-label="Previous year"
                onClick={() => setViewYear(viewYear - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold" aria-live="polite">
                {viewYear}
              </span>
              <button
                type="button"
                className={navButton}
                aria-label="Next year"
                onClick={() => setViewYear(viewYear + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS.map((name, m) => {
                const isCurrent = viewYear === focused.getFullYear() && m === viewMonth
                return (
                  <button
                    key={name}
                    type="button"
                    aria-label={`${name} ${viewYear}`}
                    disabled={isMonthDisabled(viewYear, m)}
                    onClick={() => {
                      setFocused(
                        addMonths(focused, (viewYear - focused.getFullYear()) * 12 + m - viewMonth),
                      )
                      setView('days')
                    }}
                    className={cn(
                      // 4 rows x 60px + gaps = the day view's weekday row + 6-week grid, so switching views never resizes.
                      'h-[3.75rem] rounded-md text-sm transition-colors focus-visible:outline-none',
                      'focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-30',
                      isCurrent
                        ? 'bg-primary font-semibold text-primary-foreground hover:bg-primary/90'
                        : 'hover:bg-accent hover:text-accent-foreground',
                    )}
                  >
                    {name.slice(0, 3)}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-2 flex items-center justify-between border-t pt-2">
          <button
            type="button"
            className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40"
            disabled={!selected}
            onClick={() => select(null)}
          >
            Clear
          </button>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
            disabled={todayDisabled}
            onClick={() => select(today)}
          >
            Today
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
