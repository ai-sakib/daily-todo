import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  compareDateKeys,
  formatLongDate,
  formatRelativeDay,
  formatShortDate,
  formatTime,
  fromDateKey,
  greetingForNow,
  isFutureDate,
  isPastDate,
  shiftDateKey,
  toDateKey,
  todayKey,
} from '~/utils/date'

// Tests run pinned to Asia/Dhaka (UTC+6); see vitest.config.ts.
const setNow = (iso: string) => vi.setSystemTime(new Date(iso))

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('toDateKey', () => {
  it('formats as YYYY-MM-DD', () => {
    expect(toDateKey(new Date(2026, 7, 3, 12))).toBe('2026-08-03')
  })

  it('zero-pads single-digit months and days', () => {
    expect(toDateKey(new Date(2026, 0, 5, 12))).toBe('2026-01-05')
  })

  it('uses the local day, not the UTC day', () => {
    // 00:30 in Dhaka on the 3rd is still 18:30 UTC on the 2nd. `toISOString()`
    // would say "2026-08-02" here — the bug this function exists to prevent.
    const justAfterLocalMidnight = new Date('2026-08-02T18:30:00.000Z')
    expect(justAfterLocalMidnight.toISOString().slice(0, 10)).toBe('2026-08-02')
    expect(toDateKey(justAfterLocalMidnight)).toBe('2026-08-03')
  })

  it('holds at the last moment of a local day', () => {
    expect(toDateKey(new Date(2026, 7, 3, 23, 59, 59, 999))).toBe('2026-08-03')
  })

  it('defaults to now', () => {
    setNow('2026-08-03T06:00:00.000Z')
    expect(toDateKey()).toBe('2026-08-03')
  })
})

describe('fromDateKey', () => {
  it('parses at local midnight rather than UTC midnight', () => {
    const date = fromDateKey('2026-08-03')
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(7)
    expect(date.getDate()).toBe(3)
    expect(date.getHours()).toBe(0)
  })

  it('round-trips with toDateKey', () => {
    for (const key of ['2026-01-01', '2026-02-28', '2024-02-29', '2026-12-31']) {
      expect(toDateKey(fromDateKey(key))).toBe(key)
    }
  })

  it('does not drift a day, unlike `new Date(key)`', () => {
    // `new Date('2026-08-03')` parses as UTC midnight => 06:00 local, same day
    // here, but the previous day in any negative-offset zone. fromDateKey is
    // offset-independent.
    expect(fromDateKey('2026-08-03').getDate()).toBe(3)
  })
})

describe('shiftDateKey', () => {
  it('moves forward and backward', () => {
    expect(shiftDateKey('2026-08-03', 1)).toBe('2026-08-04')
    expect(shiftDateKey('2026-08-03', -1)).toBe('2026-08-02')
  })

  it('is a no-op for zero', () => {
    expect(shiftDateKey('2026-08-03', 0)).toBe('2026-08-03')
  })

  it('crosses month boundaries', () => {
    expect(shiftDateKey('2026-08-31', 1)).toBe('2026-09-01')
    expect(shiftDateKey('2026-09-01', -1)).toBe('2026-08-31')
  })

  it('crosses year boundaries', () => {
    expect(shiftDateKey('2026-12-31', 1)).toBe('2027-01-01')
    expect(shiftDateKey('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('handles leap years', () => {
    expect(shiftDateKey('2024-02-28', 1)).toBe('2024-02-29')
    expect(shiftDateKey('2024-02-29', 1)).toBe('2024-03-01')
    expect(shiftDateKey('2026-02-28', 1)).toBe('2026-03-01')
  })

  it('handles large offsets', () => {
    expect(shiftDateKey('2026-08-03', 365)).toBe('2027-08-03')
    expect(shiftDateKey('2026-08-03', -30)).toBe('2026-07-04')
  })

  it('composes consistently', () => {
    expect(shiftDateKey(shiftDateKey('2026-08-03', 7), -7)).toBe('2026-08-03')
  })
})

describe('todayKey / isPastDate / isFutureDate', () => {
  beforeEach(() => setNow('2026-08-03T06:00:00.000Z'))

  it('reports the local today', () => {
    expect(todayKey()).toBe('2026-08-03')
  })

  it('classifies past, present and future', () => {
    expect(isPastDate('2026-08-02')).toBe(true)
    expect(isFutureDate('2026-08-04')).toBe(true)
    expect(isPastDate('2026-08-03')).toBe(false)
    expect(isFutureDate('2026-08-03')).toBe(false)
  })

  it('treats today as neither past nor future right after local midnight', () => {
    setNow('2026-08-02T18:00:00.000Z') // 00:00 on the 3rd in Dhaka
    expect(isPastDate('2026-08-03')).toBe(false)
    expect(isFutureDate('2026-08-03')).toBe(false)
  })
})

describe('compareDateKeys', () => {
  it('orders chronologically', () => {
    expect(compareDateKeys('2026-08-02', '2026-08-03')).toBe(-1)
    expect(compareDateKeys('2026-08-03', '2026-08-02')).toBe(1)
    expect(compareDateKeys('2026-08-03', '2026-08-03')).toBe(0)
  })

  it('sorts a list correctly', () => {
    const keys = ['2026-12-01', '2026-01-02', '2026-01-10']
    expect([...keys].sort(compareDateKeys)).toEqual(['2026-01-02', '2026-01-10', '2026-12-01'])
  })
})

describe('formatting', () => {
  it('formats a long date', () => {
    expect(formatLongDate('2026-08-03')).toBe('Monday, August 3, 2026')
  })

  it('formats a short date', () => {
    expect(formatShortDate('2026-08-03')).toBe('Mon, Aug 3')
  })

  it('labels today, yesterday and tomorrow relatively', () => {
    setNow('2026-08-03T06:00:00.000Z')
    expect(formatRelativeDay('2026-08-03')).toBe('Today')
    expect(formatRelativeDay('2026-08-02')).toBe('Yesterday')
    expect(formatRelativeDay('2026-08-04')).toBe('Tomorrow')
  })

  it('falls back to a short date beyond one day out', () => {
    setNow('2026-08-03T06:00:00.000Z')
    expect(formatRelativeDay('2026-08-05')).toBe('Wed, Aug 5')
    expect(formatRelativeDay('2026-08-01')).toBe('Sat, Aug 1')
  })

  it('labels relatively across a month boundary', () => {
    setNow('2026-09-01T06:00:00.000Z')
    expect(formatRelativeDay('2026-08-31')).toBe('Yesterday')
  })
})

describe('formatTime', () => {
  it('renders a timestamp in local time', () => {
    // 03:41 UTC is 09:41 in Dhaka.
    expect(formatTime('2026-08-03T03:41:00.000Z')).toBe('09:41 AM')
  })

  it('uses a 12-hour clock with a PM marker', () => {
    expect(formatTime('2026-08-03T13:05:00.000Z')).toBe('07:05 PM')
  })

  it('returns an empty string for null or empty input', () => {
    expect(formatTime(null)).toBe('')
    expect(formatTime('')).toBe('')
  })
})

describe('greetingForNow', () => {
  it.each([
    ['Still up', 2],
    ['Good morning', 5],
    ['Good morning', 11],
    ['Good afternoon', 12],
    ['Good afternoon', 16],
    ['Good evening', 17],
    ['Good evening', 23],
  ])('says "%s" at %i:00', (expected, hour) => {
    expect(greetingForNow(new Date(2026, 7, 3, hour))).toBe(expected)
  })

  it('covers the exact boundaries', () => {
    expect(greetingForNow(new Date(2026, 7, 3, 0, 0))).toBe('Still up')
    expect(greetingForNow(new Date(2026, 7, 3, 4, 59))).toBe('Still up')
  })

  it('defaults to now', () => {
    setNow('2026-08-03T04:00:00.000Z') // 10:00 in Dhaka
    expect(greetingForNow()).toBe('Good morning')
  })
})
