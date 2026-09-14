const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
})

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return dateFormatter.format(new Date(value))
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  return dateTimeFormatter.format(new Date(value))
}

/**
 * A native `<input type="date">` only accepts a bare `YYYY-MM-DD` value - anything else (like the
 * full ISO datetime the API returns, e.g. "2026-09-10T00:00:00.000Z") is silently rejected and the
 * input just renders empty. Trims down to what the input actually accepts, so edit forms pre-fill.
 */
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

export function isOverdue(dueDate: string | null | undefined, status?: string): boolean {
  if (!dueDate) return false
  if (status === 'Done' || status === 'Completed') return false
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
