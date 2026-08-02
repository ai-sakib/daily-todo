import type { DailyTodo, DayProgress } from '~/types'

/**
 * `item_key` is the stable link between a routine definition (`todo_items`) and
 * its daily instances (`daily_todos`). It is generated once at creation time and
 * never changes, so renaming an item still propagates to the right rows.
 */
export function createItemKey(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 50)

  return `${slug || 'item'}_${Date.now().toString(36)}`
}

export function calculateProgress(todos: Pick<DailyTodo, 'is_completed'>[]): DayProgress {
  const total = todos.length
  const completed = todos.filter(todo => todo.is_completed).length

  return {
    total,
    completed,
    remaining: total - completed,
    percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
    isComplete: total > 0 && completed === total,
  }
}

/** Open items first (A→Z), then completed ones with the most recent on top. */
export function sortForBoard(todos: DailyTodo[]): DailyTodo[] {
  return [...todos].sort((a, b) => {
    if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1
    if (a.is_completed) {
      return (b.completed_at ?? '').localeCompare(a.completed_at ?? '')
    }
    return a.item_name.localeCompare(b.item_name)
  })
}

/**
 * Longest run of fully-completed days ending today (or yesterday, so the streak
 * survives until the current day is finished).
 */
export function calculateStreak(todos: Pick<DailyTodo, 'todo_date' | 'is_completed'>[]): number {
  const byDate = new Map<string, { total: number; completed: number }>()

  for (const todo of todos) {
    const day = byDate.get(todo.todo_date) ?? { total: 0, completed: 0 }
    day.total += 1
    if (todo.is_completed) day.completed += 1
    byDate.set(todo.todo_date, day)
  }

  const isPerfect = (key: string) => {
    const day = byDate.get(key)
    return !!day && day.total > 0 && day.total === day.completed
  }

  const today = todayKey()
  let cursor = isPerfect(today) ? today : shiftDateKey(today, -1)
  let streak = 0

  while (isPerfect(cursor)) {
    streak += 1
    cursor = shiftDateKey(cursor, -1)
  }

  return streak
}

/** Postgres unique-violation — the item already exists for that day. */
export function isDuplicateError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505'
}

export function errorMessage(error: unknown, fallback: string): string {
  if (isDuplicateError(error)) return 'That item is already on this day.'
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'object' && error !== null) {
    const message = (error as { message?: string }).message
    if (message) return message
  }
  return fallback
}
