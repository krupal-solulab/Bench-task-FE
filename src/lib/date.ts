// Module 11 gap-closure: the signed-in user's display time zone (set by AuthContext from their
// profile). Undefined - the default, and every user who never picks one - means the browser's
// own, exactly as before.
let displayTimeZone: string | undefined

let dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })
let dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})
const calendarDateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeZone: 'UTC',
})

export function setDisplayTimeZone(timeZone: string | null | undefined): void {
  const next = timeZone || undefined
  if (next === displayTimeZone) return
  try {
    dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: next })
    dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: next,
    })
    displayTimeZone = next
  } catch {
    // An unrecognized zone (shouldn't happen - the API validates it) keeps the current one.
  }
}

export function getDisplayTimeZone(): string | undefined {
  return displayTimeZone
}

/** A date-only value (due/start dates are stored as midnight UTC) - shown by its calendar date,
 * never shifted to the previous day in a time zone west of UTC. */
function isCalendarDate(value: string): boolean {
  return /T00:00:00(\.000)?Z$/.test(value) || /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  if (isCalendarDate(value)) return calendarDateFormatter.format(new Date(value))
  return dateFormatter.format(new Date(value))
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  return dateTimeFormatter.format(new Date(value))
}

/** Old ICU names some browsers still list, mapped to the names people actually search for. */
const ZONE_RENAMES: Record<string, string> = {
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Saigon': 'Asia/Ho_Chi_Minh',
  'Asia/Katmandu': 'Asia/Kathmandu',
  'Asia/Rangoon': 'Asia/Yangon',
  'Europe/Kiev': 'Europe/Kyiv',
}

/**
 * IANA zones for the profile picker - modern names (Kolkata, not Calcutta), always including the
 * browser's own zone and any zone the user already saved, sorted. A short list on old browsers.
 */
export function listTimeZones(extra: Array<string | null | undefined> = []): string[] {
  const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] })
    .supportedValuesOf
  const base = supported
    ? supported('timeZone')
    : [
        'UTC',
        'Asia/Kolkata',
        'Asia/Dubai',
        'Asia/Singapore',
        'Asia/Tokyo',
        'Europe/London',
        'Europe/Berlin',
        'America/New_York',
        'America/Chicago',
        'America/Los_Angeles',
        'Australia/Sydney',
      ]
  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const all = [...base, browserZone, ...extra].filter((z): z is string => !!z)
  return [...new Set(all.map(modernTimeZoneName))].sort()
}

/** The current IANA name for a zone ICU may still report by its old name (Calcutta -> Kolkata). */
export function modernTimeZoneName(zone: string): string {
  return ZONE_RENAMES[zone] ?? zone
}

const dayLabelFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

/** A local calendar day spelled out ("March 1, 2026") - the DatePicker's day-cell name. */
export function formatDayLabel(date: Date): string {
  return dayLabelFormatter.format(date)
}

export function toDateInputValue(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : ''
}

export function formatRelativeTime(value: string): string {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const diffMs = new Date(value).getTime() - Date.now()
  const diffMinutes = Math.round(diffMs / 60_000)

  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, 'minute')
  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour')
  const diffDays = Math.round(diffHours / 24)
  if (Math.abs(diffDays) < 30) return rtf.format(diffDays, 'day')
  const diffMonths = Math.round(diffDays / 30)
  if (Math.abs(diffMonths) < 12) return rtf.format(diffMonths, 'month')
  return rtf.format(Math.round(diffMonths / 12), 'year')
}

/**
 * `isDone` (a Task's category-based "is this done", not its literal status name) takes precedence
 * when given, so a custom workflow's differently-named Done status (e.g. "Shipped") is still
 * correctly treated as not-overdue. `status` stays for Project's fixed 'Completed' literal.
 */
export function isOverdue(
  dueDate: string | null | undefined,
  status?: string,
  isDone?: boolean,
): boolean {
  if (!dueDate) return false
  if (isDone ?? (status === 'Done' || status === 'Completed')) return false
  return new Date(dueDate).getTime() < Date.now()
}

/**
 * The Mon–Fri work-week grid for a Calendar view (month is 0-indexed, matching native Date).
 * Always returns whole weeks, so the first/last rows include leading/trailing days from the
 * adjacent month - exactly what a month calendar grid needs to render without gaps.
 */
export function getMonthGridWeeks(year: number, month: number): Date[][] {
  const firstOfMonth = new Date(year, month, 1)
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7
  const gridStart = new Date(year, month, firstOfMonth.getDate() - mondayOffset)

  const lastOfMonth = new Date(year, month + 1, 0)
  const fridayOffset = (5 - lastOfMonth.getDay() + 7) % 7
  const gridEnd = new Date(year, month, lastOfMonth.getDate() + fridayOffset)

  const weeks: Date[][] = []
  for (let weekIndex = 0; ; weekIndex++) {
    const monday = new Date(gridStart)
    monday.setDate(monday.getDate() + weekIndex * 7)
    if (monday > gridEnd) break
    weeks.push(
      Array.from({ length: 5 }, (_, i) => {
        const day = new Date(monday)
        day.setDate(day.getDate() + i)
        return day
      }),
    )
  }
  return weeks
}

/**
 * Greedy interval-graph coloring: sorts by start date and reuses the first lane whose last item
 * has already ended, otherwise opens a new lane. Used to stack overlapping sprint bars on a
 * Calendar view without any of them visually colliding. `startDate`/`endDate` must be ISO date
 * strings (plain string comparison is chronologically correct for that format).
 */
export function assignLanes<T extends { startDate: string; endDate: string }>(
  items: T[],
): Array<{ item: T; lane: number }> {
  const sorted = [...items].sort((a, b) => a.startDate.localeCompare(b.startDate))
  const laneEndDates: string[] = []
  const result: Array<{ item: T; lane: number }> = []

  for (const item of sorted) {
    let lane = laneEndDates.findIndex((endDate) => endDate < item.startDate)
    if (lane === -1) {
      lane = laneEndDates.length
      laneEndDates.push(item.endDate)
    } else {
      laneEndDates[lane] = item.endDate
    }
    result.push({ item, lane })
  }
  return result
}
