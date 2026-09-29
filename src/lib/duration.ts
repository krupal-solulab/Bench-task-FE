const HOURS_PER_DAY = 8

// Deliberately terse (matches Jira's own "2h 30m" shorthand) - "2 hours" or "90 minutes" (full
// words) aren't accepted, only single-letter unit suffixes.
const SHORTHAND_PATTERN =
  /^\s*(?:(\d*\.?\d+)\s*d)?\s*(?:(\d*\.?\d+)\s*h)?\s*(?:(\d*\.?\d+)\s*m)?\s*$/i

/**
 * Parses a Jira-style duration shorthand ("2h 30m", "1d", "90m") into decimal hours. A string with
 * no d/h/m unit letters at all is treated as a plain decimal hours value ("2.5" -> 2.5), so this
 * stays backward compatible with the old plain-number input. Returns null for anything it can't
 * confidently parse - the caller decides how to surface that as a validation error.
 */
export function parseDurationShorthand(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  if (!/[dhm]/i.test(trimmed)) {
    const plain = Number(trimmed)
    return Number.isFinite(plain) ? plain : null
  }

  const match = SHORTHAND_PATTERN.exec(trimmed)
  if (!match) return null
  const [, days, hours, minutes] = match
  if (!days && !hours && !minutes) return null

  const total =
    (days ? Number(days) * HOURS_PER_DAY : 0) +
    (hours ? Number(hours) : 0) +
    (minutes ? Number(minutes) / 60 : 0)
  return total > 0 ? Math.round(total * 100) / 100 : null
}

/** The reverse of `parseDurationShorthand`, for pre-filling an edit form from a stored decimal
 * hours value - e.g. 2.5 -> "2h 30m". */
export function formatHoursAsShorthand(hours: number): string {
  if (hours <= 0) return '0h'
  const totalMinutes = Math.round(hours * 60)
  const wholeHours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (wholeHours > 0 && minutes > 0) return `${wholeHours}h ${minutes}m`
  if (wholeHours > 0) return `${wholeHours}h`
  return `${minutes}m`
}
