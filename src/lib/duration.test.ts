import { describe, expect, it } from 'vitest'
import { formatHoursAsShorthand, parseDurationShorthand } from './duration'

describe('parseDurationShorthand', () => {
  it('parses a plain decimal as hours (backward compatible with the old number-only input)', () => {
    expect(parseDurationShorthand('2.5')).toBe(2.5)
    expect(parseDurationShorthand('2')).toBe(2)
  })

  it('parses "Xh Ym" shorthand', () => {
    expect(parseDurationShorthand('2h 30m')).toBe(2.5)
  })

  it('parses hours-only and minutes-only shorthand', () => {
    expect(parseDurationShorthand('3h')).toBe(3)
    expect(parseDurationShorthand('90m')).toBe(1.5)
  })

  it('parses "Xd" as 8-hour days', () => {
    expect(parseDurationShorthand('1d')).toBe(8)
  })

  it('parses combined day/hour shorthand', () => {
    expect(parseDurationShorthand('1d 4h')).toBe(12)
  })

  it('is case-insensitive and tolerates extra whitespace', () => {
    expect(parseDurationShorthand('2H 30M')).toBe(2.5)
    expect(parseDurationShorthand('  2h   30m  ')).toBe(2.5)
  })

  it('returns null for an empty or whitespace-only string', () => {
    expect(parseDurationShorthand('')).toBeNull()
    expect(parseDurationShorthand('   ')).toBeNull()
  })

  it('returns null for unparseable garbage', () => {
    expect(parseDurationShorthand('abc')).toBeNull()
    expect(parseDurationShorthand('2 hours')).toBeNull()
  })

  it('returns null for a zero-length duration', () => {
    expect(parseDurationShorthand('0h 0m')).toBeNull()
  })
})

describe('formatHoursAsShorthand', () => {
  it('formats a fractional-hour value as "Xh Ym"', () => {
    expect(formatHoursAsShorthand(2.5)).toBe('2h 30m')
  })

  it('formats a whole-hour value without a minutes part', () => {
    expect(formatHoursAsShorthand(1)).toBe('1h')
  })

  it('formats a sub-hour value as minutes only', () => {
    expect(formatHoursAsShorthand(0.5)).toBe('30m')
  })

  it('round-trips through parseDurationShorthand', () => {
    const formatted = formatHoursAsShorthand(3.25)
    expect(parseDurationShorthand(formatted)).toBe(3.25)
  })
})
