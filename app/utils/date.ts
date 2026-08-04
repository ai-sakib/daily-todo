import type { DateKey } from '~/types'

/**
 * Every date in this app is a local calendar day, never an instant. `en-CA`
 * formats as `YYYY-MM-DD`, which is exactly the shape Postgres `date` columns
 * expect — and unlike `toISOString()` it does not shift across the UTC boundary.
 */
export function toDateKey(date: Date = new Date()): DateKey {
  return date.toLocaleDateString('en-CA')
}

/** Parses a date key at local midnight (plain `new Date(key)` parses as UTC). */
export function fromDateKey(key: DateKey): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year!, (month ?? 1) - 1, day ?? 1)
}

export function shiftDateKey(key: DateKey, days: number): DateKey {
  const date = fromDateKey(key)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

export function todayKey(): DateKey {
  return toDateKey()
}

export function compareDateKeys(a: DateKey, b: DateKey): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function isFutureDate(key: DateKey): boolean {
  return key > todayKey()
}

export function isPastDate(key: DateKey): boolean {
  return key < todayKey()
}

/** e.g. `Monday, 12 January 2026` */
export function formatLongDate(key: DateKey): string {
  return fromDateKey(key).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/** e.g. `Mon, Jan 12` */
export function formatShortDate(key: DateKey): string {
  return fromDateKey(key).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/** `Today` / `Yesterday` / `Tomorrow`, falling back to the short date. */
export function formatRelativeDay(key: DateKey): string {
  const today = todayKey()
  if (key === today) return 'Today'
  if (key === shiftDateKey(today, -1)) return 'Yesterday'
  if (key === shiftDateKey(today, 1)) return 'Tomorrow'
  return formatShortDate(key)
}

/** Formats a timestamptz as a local wall-clock time, e.g. `09:41 AM`. */
export function formatTime(timestamp: string | null): string {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Formats a timestamptz as a calendar date, e.g. `Jan 12, 2026`.
 *
 * Unlike the `DateKey` helpers this takes an instant, so it is for audit
 * columns (`created_at`, `decided_at`) rather than for a user's day.
 */
export function formatTimestampDate(timestamp: string | null): string {
  if (!timestamp) return '—'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function greetingForNow(date: Date = new Date()): string {
  const hour = date.getHours()
  if (hour < 5) return 'Still up'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
