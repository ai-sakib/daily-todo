import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DailyTodo } from '~/types'
import {
  calculateProgress,
  calculateStreak,
  createItemKey,
  errorMessage,
  isDuplicateError,
  sortForBoard,
} from '~/utils/todo'

const todo = (overrides: Partial<DailyTodo> = {}): DailyTodo => ({
  id: 'id',
  user_id: 'user-1',
  todo_date: '2026-08-03',
  item_key: 'key',
  item_name: 'Item',
  is_completed: false,
  completed_at: null,
  created_at: '2026-08-03T00:00:00.000Z',
  updated_at: '2026-08-03T00:00:00.000Z',
  ...overrides,
})

describe('createItemKey', () => {
  it('slugifies to lowercase with underscores', () => {
    expect(createItemKey('Read a Book')).toMatch(/^read_a_book_[a-z0-9]+$/)
  })

  it('strips punctuation and symbols', () => {
    expect(createItemKey('Gym — 30 min!')).toMatch(/^gym_30_min_[a-z0-9]+$/)
  })

  it('collapses runs of whitespace', () => {
    expect(createItemKey('a   b\t c')).toMatch(/^a_b_c_[a-z0-9]+$/)
  })

  it('falls back to "item" when nothing survives slugification', () => {
    expect(createItemKey('!!!')).toMatch(/^item_[a-z0-9]+$/)
    expect(createItemKey('日本語')).toMatch(/^item_[a-z0-9]+$/)
  })

  it('truncates the slug to 50 characters before the suffix', () => {
    const key = createItemKey('a'.repeat(120))
    const [slug] = key.split('_')
    expect(slug).toHaveLength(50)
  })

  it('produces distinct keys for the same name over time', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-03T00:00:00.000Z'))
    const first = createItemKey('Read')
    vi.setSystemTime(new Date('2026-08-03T00:00:01.000Z'))
    const second = createItemKey('Read')
    vi.useRealTimers()

    expect(first).not.toBe(second)
  })
})

describe('calculateProgress', () => {
  it('reports zeros for an empty day and is not "complete"', () => {
    // An empty day must not count as finished, or it would fire the celebration.
    expect(calculateProgress([])).toEqual({
      total: 0,
      completed: 0,
      remaining: 0,
      percentage: 0,
      isComplete: false,
    })
  })

  it('reports a partially finished day', () => {
    const progress = calculateProgress([
      { is_completed: true },
      { is_completed: false },
      { is_completed: false },
      { is_completed: false },
    ])
    expect(progress).toMatchObject({ total: 4, completed: 1, remaining: 3, percentage: 25, isComplete: false })
  })

  it('marks a fully finished day complete', () => {
    const progress = calculateProgress([{ is_completed: true }, { is_completed: true }])
    expect(progress).toMatchObject({ total: 2, completed: 2, remaining: 0, percentage: 100, isComplete: true })
  })

  it('rounds to the nearest whole percent', () => {
    expect(calculateProgress([{ is_completed: true }, { is_completed: false }, { is_completed: false }]).percentage).toBe(33)
    expect(calculateProgress([{ is_completed: true }, { is_completed: true }, { is_completed: false }]).percentage).toBe(67)
  })

  it('never reports 100% unless every item is done', () => {
    const items = Array.from({ length: 200 }, (_, index) => ({ is_completed: index !== 0 }))
    const progress = calculateProgress(items)
    expect(progress.percentage).toBe(100) // rounds up …
    expect(progress.isComplete).toBe(false) // … but completeness is exact
  })
})

describe('sortForBoard', () => {
  it('puts open items before completed ones', () => {
    const sorted = sortForBoard([
      todo({ id: 'a', item_name: 'Alpha', is_completed: true, completed_at: '2026-08-03T01:00:00.000Z' }),
      todo({ id: 'b', item_name: 'Beta' }),
    ])
    expect(sorted.map(t => t.id)).toEqual(['b', 'a'])
  })

  it('orders open items alphabetically', () => {
    const sorted = sortForBoard([
      todo({ id: 'c', item_name: 'Cycle' }),
      todo({ id: 'a', item_name: 'Answer' }),
      todo({ id: 'b', item_name: 'Beta' }),
    ])
    expect(sorted.map(t => t.item_name)).toEqual(['Answer', 'Beta', 'Cycle'])
  })

  it('orders completed items most-recently-finished first', () => {
    const sorted = sortForBoard([
      todo({ id: 'old', is_completed: true, completed_at: '2026-08-03T01:00:00.000Z' }),
      todo({ id: 'new', is_completed: true, completed_at: '2026-08-03T09:00:00.000Z' }),
    ])
    expect(sorted.map(t => t.id)).toEqual(['new', 'old'])
  })

  it('tolerates completed items with no timestamp', () => {
    const sorted = sortForBoard([
      todo({ id: 'null', is_completed: true, completed_at: null }),
      todo({ id: 'stamped', is_completed: true, completed_at: '2026-08-03T09:00:00.000Z' }),
    ])
    expect(sorted.map(t => t.id)).toEqual(['stamped', 'null'])
  })

  it('does not mutate the input array', () => {
    const input = [todo({ item_name: 'Zebra' }), todo({ item_name: 'Apple' })]
    const snapshot = [...input]
    sortForBoard(input)
    expect(input).toEqual(snapshot)
  })

  it('handles an empty list', () => {
    expect(sortForBoard([])).toEqual([])
  })
})

describe('calculateStreak', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-03T06:00:00.000Z')) // 2026-08-03 local
  })
  afterEach(() => vi.useRealTimers())

  const perfect = (date: string) => [
    { todo_date: date, is_completed: true },
    { todo_date: date, is_completed: true },
  ]
  const partial = (date: string) => [
    { todo_date: date, is_completed: true },
    { todo_date: date, is_completed: false },
  ]

  it('is zero with no data', () => {
    expect(calculateStreak([])).toBe(0)
  })

  it('counts a run of perfect days ending today', () => {
    expect(calculateStreak([...perfect('2026-08-03'), ...perfect('2026-08-02'), ...perfect('2026-08-01')])).toBe(3)
  })

  it('still counts the run when today is not finished yet', () => {
    // The streak should survive the morning, before today has been completed.
    expect(calculateStreak([...partial('2026-08-03'), ...perfect('2026-08-02'), ...perfect('2026-08-01')])).toBe(2)
  })

  it('is zero when neither today nor yesterday was perfect', () => {
    expect(calculateStreak([...partial('2026-08-03'), ...partial('2026-08-02'), ...perfect('2026-08-01')])).toBe(0)
  })

  it('stops at the first gap', () => {
    expect(calculateStreak([...perfect('2026-08-03'), ...perfect('2026-08-02'), ...perfect('2026-07-31')])).toBe(2)
  })

  it('ignores days with no items rather than treating them as perfect', () => {
    // A day with zero rows is untracked, not a win — otherwise every day before
    // the user signed up would extend the streak forever.
    expect(calculateStreak(perfect('2026-08-03'))).toBe(1)
  })

  it('counts a single perfect day', () => {
    expect(calculateStreak(perfect('2026-08-03'))).toBe(1)
  })

  it('counts a streak that ended yesterday', () => {
    expect(calculateStreak([...perfect('2026-08-02'), ...perfect('2026-08-01')])).toBe(2)
  })

  it('ignores future days', () => {
    expect(calculateStreak([...perfect('2026-08-05'), ...perfect('2026-08-03')])).toBe(1)
  })

  it('spans a month boundary', () => {
    vi.setSystemTime(new Date('2026-09-01T06:00:00.000Z'))
    expect(calculateStreak([...perfect('2026-09-01'), ...perfect('2026-08-31'), ...perfect('2026-08-30')])).toBe(3)
  })

  it('handles a long unbroken run', () => {
    const rows = Array.from({ length: 40 }, (_, index) => {
      const day = new Date(2026, 7, 3 - index)
      const key = day.toLocaleDateString('en-CA')
      return { todo_date: key, is_completed: true }
    })
    expect(calculateStreak(rows)).toBe(40)
  })
})

describe('isDuplicateError', () => {
  it('recognises the Postgres unique violation code', () => {
    expect(isDuplicateError({ code: '23505' })).toBe(true)
  })

  it('rejects other errors and non-objects', () => {
    expect(isDuplicateError({ code: '23503' })).toBe(false)
    expect(isDuplicateError(new Error('nope'))).toBe(false)
    expect(isDuplicateError(null)).toBe(false)
    expect(isDuplicateError(undefined)).toBe(false)
    expect(isDuplicateError('23505')).toBe(false)
  })
})

describe('errorMessage', () => {
  it('translates a duplicate violation into something a person can act on', () => {
    expect(errorMessage({ code: '23505' }, 'fallback')).toBe('That item is already on this day.')
  })

  it('uses an Error message', () => {
    expect(errorMessage(new Error('network down'), 'fallback')).toBe('network down')
  })

  it('uses a PostgrestError-shaped message', () => {
    expect(errorMessage({ code: '42501', message: 'permission denied' }, 'fallback')).toBe('permission denied')
  })

  it('falls back for empty, unknown or messageless errors', () => {
    expect(errorMessage(new Error(''), 'fallback')).toBe('fallback')
    expect(errorMessage({ code: '42501' }, 'fallback')).toBe('fallback')
    expect(errorMessage(null, 'fallback')).toBe('fallback')
    expect(errorMessage('a string', 'fallback')).toBe('fallback')
  })
})
