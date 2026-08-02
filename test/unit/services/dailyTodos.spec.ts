import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addItemToUpcomingDays,
  addTodo,
  defaultHistoryRange,
  deleteFutureByKey,
  deleteTodo,
  insertTodos,
  isDayInitialized,
  listByDate,
  listByRange,
  listCompletionFlags,
  listInitializedDatesFrom,
  loadDay,
  markDayInitialized,
  renameFutureByKey,
  renameTodo,
  setCompleted,
  syncRoutineIntoDay,
} from '~/services/dailyTodos'
import { FakeSupabase, makeDailyTodo, makeTodoItem, type Row } from '../../helpers/fakeSupabase'

const USER = 'user-1'
const OTHER = 'user-2'
const TODAY = '2026-08-03'
const YESTERDAY = '2026-08-02'
const TOMORROW = '2026-08-04'

let db: FakeSupabase

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-03T06:00:00.000Z')) // 2026-08-03 in Asia/Dhaka
  db = new FakeSupabase()
})

afterEach(() => vi.useRealTimers())

const seed = (table: string, rows: Row[]) => db.tables[table]!.push(...rows)

describe('listByDate', () => {
  it('returns only the given user and day, ordered by name', () => {
    seed('daily_todos', [
      makeDailyTodo({ todo_date: TODAY, item_name: 'Zebra' }),
      makeDailyTodo({ todo_date: TODAY, item_name: 'Apple' }),
      makeDailyTodo({ todo_date: YESTERDAY, item_name: 'Other day' }),
      makeDailyTodo({ todo_date: TODAY, item_name: 'Someone else', user_id: OTHER }),
    ])

    return expect(listByDate(db.asDb(), USER, TODAY)).resolves.toMatchObject([
      { item_name: 'Apple' },
      { item_name: 'Zebra' },
    ])
  })

  it('returns an empty array for a day with nothing on it', async () => {
    await expect(listByDate(db.asDb(), USER, TODAY)).resolves.toEqual([])
  })

  it('throws when the query fails', async () => {
    db.failNext({ code: '42501', message: 'permission denied' })
    await expect(listByDate(db.asDb(), USER, TODAY)).rejects.toMatchObject({ code: '42501' })
  })
})

describe('listByRange', () => {
  beforeEach(() => {
    seed('daily_todos', [
      makeDailyTodo({ todo_date: '2026-08-01' }),
      makeDailyTodo({ todo_date: '2026-08-03' }),
      makeDailyTodo({ todo_date: '2026-08-05' }),
      makeDailyTodo({ todo_date: '2026-08-03', user_id: OTHER }),
    ])
  })

  it('includes both endpoints of the range', async () => {
    const rows = await listByRange(db.asDb(), USER, '2026-08-01', '2026-08-05')
    expect(rows).toHaveLength(3)
  })

  it('excludes days outside the range', async () => {
    const rows = await listByRange(db.asDb(), USER, '2026-08-02', '2026-08-04')
    expect(rows.map(row => row.todo_date)).toEqual(['2026-08-03'])
  })

  it('returns newest day first', async () => {
    const rows = await listByRange(db.asDb(), USER, '2026-08-01', '2026-08-05')
    expect(rows.map(row => row.todo_date)).toEqual(['2026-08-05', '2026-08-03', '2026-08-01'])
  })

  it('handles an inverted range by returning nothing', async () => {
    await expect(listByRange(db.asDb(), USER, '2026-08-05', '2026-08-01')).resolves.toEqual([])
  })
})

describe('listCompletionFlags', () => {
  it('projects only the two columns the streak needs', async () => {
    seed('daily_todos', [makeDailyTodo({ todo_date: TODAY, is_completed: true })])
    const [flag] = await listCompletionFlags(db.asDb(), USER, YESTERDAY, TOMORROW)
    expect(Object.keys(flag!).sort()).toEqual(['is_completed', 'todo_date'])
  })
})

describe('insertTodos', () => {
  it('short-circuits on an empty list without touching the database', async () => {
    await expect(insertTodos(db.asDb(), [])).resolves.toEqual([])
    expect(db.log).toHaveLength(0)
  })

  it('inserts many rows in a single call', async () => {
    const rows = await insertTodos(db.asDb(), [
      { user_id: USER, todo_date: TODAY, item_key: 'a', item_name: 'A', is_completed: false },
      { user_id: USER, todo_date: TODAY, item_key: 'b', item_name: 'B', is_completed: false },
    ])

    expect(rows).toHaveLength(2)
    expect(db.countOps('daily_todos', 'insert')).toBe(1)
  })
})

describe('addTodo', () => {
  it('creates an open item and returns it', async () => {
    const created = await addTodo(db.asDb(), { userId: USER, date: TODAY, name: 'Walk', itemKey: 'walk_1' })

    expect(created).toMatchObject({ item_name: 'Walk', is_completed: false, todo_date: TODAY })
    expect(db.rows('daily_todos')).toHaveLength(1)
  })

  it('surfaces a unique violation so the UI can explain it', async () => {
    seed('daily_todos', [makeDailyTodo({ todo_date: TODAY, item_key: 'walk_1' })])

    await expect(
      addTodo(db.asDb(), { userId: USER, date: TODAY, name: 'Walk', itemKey: 'walk_1' }),
    ).rejects.toMatchObject({ code: '23505' })
  })

  it('allows the same key on a different day', async () => {
    seed('daily_todos', [makeDailyTodo({ todo_date: YESTERDAY, item_key: 'walk_1' })])
    await expect(
      addTodo(db.asDb(), { userId: USER, date: TODAY, name: 'Walk', itemKey: 'walk_1' }),
    ).resolves.toMatchObject({ todo_date: TODAY })
  })
})

describe('setCompleted', () => {
  it('stamps completed_at when ticking', async () => {
    seed('daily_todos', [makeDailyTodo({ id: 'x', is_completed: false })])
    await setCompleted(db.asDb(), 'x', true)

    const row = db.rows('daily_todos')[0]!
    expect(row.is_completed).toBe(true)
    expect(row.completed_at).toBe('2026-08-03T06:00:00.000Z')
    expect(row.updated_at).toBe('2026-08-03T06:00:00.000Z')
  })

  it('clears completed_at when un-ticking', async () => {
    seed('daily_todos', [makeDailyTodo({ id: 'x', is_completed: true, completed_at: 'earlier' })])
    await setCompleted(db.asDb(), 'x', false)

    expect(db.rows('daily_todos')[0]).toMatchObject({ is_completed: false, completed_at: null })
  })

  it('only touches the targeted row', async () => {
    seed('daily_todos', [makeDailyTodo({ id: 'x' }), makeDailyTodo({ id: 'y' })])
    await setCompleted(db.asDb(), 'x', true)

    expect(db.rows('daily_todos').find(r => r.id === 'y')!.is_completed).toBe(false)
  })
})

describe('renameTodo / deleteTodo', () => {
  it('renames a single row and bumps updated_at', async () => {
    seed('daily_todos', [makeDailyTodo({ id: 'x', item_name: 'Old', updated_at: 'before' })])
    await renameTodo(db.asDb(), 'x', 'New')

    expect(db.rows('daily_todos')[0]).toMatchObject({
      item_name: 'New',
      updated_at: '2026-08-03T06:00:00.000Z',
    })
  })

  it('deletes a single row', async () => {
    seed('daily_todos', [makeDailyTodo({ id: 'x' }), makeDailyTodo({ id: 'y' })])
    await deleteTodo(db.asDb(), 'x')

    expect(db.rows('daily_todos').map(r => r.id)).toEqual(['y'])
  })
})

describe('renameFutureByKey', () => {
  beforeEach(() => {
    seed('daily_todos', [
      makeDailyTodo({ id: 'past', todo_date: YESTERDAY, item_key: 'read', item_name: 'Read' }),
      makeDailyTodo({ id: 'today', todo_date: TODAY, item_key: 'read', item_name: 'Read' }),
      makeDailyTodo({ id: 'future', todo_date: TOMORROW, item_key: 'read', item_name: 'Read' }),
      makeDailyTodo({ id: 'other-key', todo_date: TODAY, item_key: 'gym', item_name: 'Gym' }),
      makeDailyTodo({ id: 'other-user', todo_date: TODAY, item_key: 'read', item_name: 'Read', user_id: OTHER }),
    ])
  })

  it('renames today and the future but never history', async () => {
    await renameFutureByKey(db.asDb(), USER, 'read', 'Read a book')

    const byId = Object.fromEntries(db.rows('daily_todos').map(r => [r.id, r.item_name]))
    expect(byId.today).toBe('Read a book')
    expect(byId.future).toBe('Read a book')
    expect(byId.past).toBe('Read') // history keeps the name it was lived under
  })

  it('matches on item_key, not on the display name', async () => {
    await renameFutureByKey(db.asDb(), USER, 'read', 'Read a book')
    expect(db.rows('daily_todos').find(r => r.id === 'other-key')!.item_name).toBe('Gym')
  })

  it('never touches another user', async () => {
    await renameFutureByKey(db.asDb(), USER, 'read', 'Read a book')
    expect(db.rows('daily_todos').find(r => r.id === 'other-user')!.item_name).toBe('Read')
  })
})

describe('deleteFutureByKey', () => {
  it('removes today and future rows, keeping history and other users', async () => {
    seed('daily_todos', [
      makeDailyTodo({ id: 'past', todo_date: YESTERDAY, item_key: 'read' }),
      makeDailyTodo({ id: 'today', todo_date: TODAY, item_key: 'read' }),
      makeDailyTodo({ id: 'future', todo_date: TOMORROW, item_key: 'read' }),
      makeDailyTodo({ id: 'other-user', todo_date: TODAY, item_key: 'read', user_id: OTHER }),
    ])

    await deleteFutureByKey(db.asDb(), USER, 'read')

    expect(db.rows('daily_todos').map(r => r.id).sort()).toEqual(['other-user', 'past'])
  })
})

describe('schedule status', () => {
  it('reports false for a day never opened', async () => {
    await expect(isDayInitialized(db.asDb(), USER, TODAY)).resolves.toBe(false)
  })

  it('reports the stored flag', async () => {
    seed('daily_schedule_status', [{ user_id: USER, schedule_date: TODAY, is_initialized: true }])
    await expect(isDayInitialized(db.asDb(), USER, TODAY)).resolves.toBe(true)
  })

  it('is scoped per user', async () => {
    seed('daily_schedule_status', [{ user_id: OTHER, schedule_date: TODAY, is_initialized: true }])
    await expect(isDayInitialized(db.asDb(), USER, TODAY)).resolves.toBe(false)
  })

  it('marks a day initialised idempotently', async () => {
    await markDayInitialized(db.asDb(), USER, TODAY)
    await markDayInitialized(db.asDb(), USER, TODAY)

    expect(db.rows('daily_schedule_status')).toHaveLength(1)
    await expect(isDayInitialized(db.asDb(), USER, TODAY)).resolves.toBe(true)
  })

  it('lists initialised days from a date onward', async () => {
    seed('daily_schedule_status', [
      { user_id: USER, schedule_date: YESTERDAY, is_initialized: true },
      { user_id: USER, schedule_date: TODAY, is_initialized: true },
      { user_id: USER, schedule_date: TOMORROW, is_initialized: true },
      { user_id: OTHER, schedule_date: TOMORROW, is_initialized: true },
    ])

    const dates = await listInitializedDatesFrom(db.asDb(), USER, TODAY)
    expect(dates.sort()).toEqual([TODAY, TOMORROW])
  })
})

describe('syncRoutineIntoDay', () => {
  beforeEach(() => {
    seed('todo_items', [
      makeTodoItem({ item_key: 'read', item_name: 'Read', is_active: true, display_order: 1 }),
      makeTodoItem({ item_key: 'gym', item_name: 'Gym', is_active: true, display_order: 2 }),
      makeTodoItem({ item_key: 'paused', item_name: 'Paused', is_active: false }),
      makeTodoItem({ item_key: 'theirs', item_name: 'Theirs', user_id: OTHER }),
    ])
  })

  it('copies only this user’s active items', async () => {
    const inserted = await syncRoutineIntoDay(db.asDb(), USER, TOMORROW, [])
    expect(inserted.map(row => row.item_key).sort()).toEqual(['gym', 'read'])
  })

  it('creates the copies unticked', async () => {
    const inserted = await syncRoutineIntoDay(db.asDb(), USER, TOMORROW, [])
    expect(inserted.every(row => row.is_completed === false)).toBe(true)
  })

  it('skips item_keys already on the day', async () => {
    const existing = [makeDailyTodo({ todo_date: TOMORROW, item_key: 'read' })] as never
    const inserted = await syncRoutineIntoDay(db.asDb(), USER, TOMORROW, existing)

    expect(inserted.map(row => row.item_key)).toEqual(['gym'])
  })

  it('adds nothing when the day is already in sync', async () => {
    const existing = [
      makeDailyTodo({ todo_date: TOMORROW, item_key: 'read' }),
      makeDailyTodo({ todo_date: TOMORROW, item_key: 'gym' }),
    ] as never

    await expect(syncRoutineIntoDay(db.asDb(), USER, TOMORROW, existing)).resolves.toEqual([])
  })

  it('marks the day initialised even when nothing was added', async () => {
    await syncRoutineIntoDay(db.asDb(), USER, TOMORROW, [])
    await expect(isDayInitialized(db.asDb(), USER, TOMORROW)).resolves.toBe(true)
  })

  it('marks the day initialised when the routine is empty', async () => {
    db.tables.todo_items = []
    await expect(syncRoutineIntoDay(db.asDb(), USER, TOMORROW, [])).resolves.toEqual([])
    await expect(isDayInitialized(db.asDb(), USER, TOMORROW)).resolves.toBe(true)
  })
})

describe('loadDay', () => {
  beforeEach(() => {
    seed('todo_items', [
      makeTodoItem({ item_key: 'read', item_name: 'Read' }),
      makeTodoItem({ item_key: 'gym', item_name: 'Gym' }),
    ])
  })

  it('seeds an untouched future day from the routine', async () => {
    const todos = await loadDay(db.asDb(), USER, TOMORROW)

    expect(todos.map(t => t.item_name)).toEqual(['Gym', 'Read'])
    await expect(isDayInitialized(db.asDb(), USER, TOMORROW)).resolves.toBe(true)
  })

  it('seeds today the first time it is opened', async () => {
    const todos = await loadDay(db.asDb(), USER, TODAY)
    expect(todos).toHaveLength(2)
  })

  it('never seeds a past day', async () => {
    // History must show what was actually lived, not today's routine.
    const todos = await loadDay(db.asDb(), USER, YESTERDAY)

    expect(todos).toEqual([])
    expect(db.rows('daily_todos')).toHaveLength(0)
    await expect(isDayInitialized(db.asDb(), USER, YESTERDAY)).resolves.toBe(false)
  })

  it('returns a past day’s own rows untouched', async () => {
    seed('daily_todos', [makeDailyTodo({ todo_date: YESTERDAY, item_key: 'read', item_name: 'Read' })])

    const todos = await loadDay(db.asDb(), USER, YESTERDAY)
    expect(todos).toHaveLength(1)
    expect(db.rows('daily_todos')).toHaveLength(1)
  })

  it('does not top up a day the user has already curated', async () => {
    // The user deliberately deleted "Gym" today; reopening must not restore it.
    seed('daily_todos', [makeDailyTodo({ todo_date: TODAY, item_key: 'read', item_name: 'Read' })])
    seed('daily_schedule_status', [{ user_id: USER, schedule_date: TODAY, is_initialized: true }])

    const todos = await loadDay(db.asDb(), USER, TODAY)
    expect(todos.map(t => t.item_key)).toEqual(['read'])
  })

  it('adopts a legacy day that has rows but no status record', async () => {
    // Days created before daily_schedule_status existed: treat as initialised
    // rather than topping them up with the current routine.
    seed('daily_todos', [makeDailyTodo({ todo_date: TODAY, item_key: 'read', item_name: 'Read' })])

    const todos = await loadDay(db.asDb(), USER, TODAY)

    expect(todos.map(t => t.item_key)).toEqual(['read'])
    await expect(isDayInitialized(db.asDb(), USER, TODAY)).resolves.toBe(true)
  })

  it('is idempotent — reopening a day creates nothing new', async () => {
    await loadDay(db.asDb(), USER, TOMORROW)
    await loadDay(db.asDb(), USER, TOMORROW)

    expect(db.rows('daily_todos')).toHaveLength(2)
  })

  it('returns an empty day when the routine is empty', async () => {
    db.tables.todo_items = []
    await expect(loadDay(db.asDb(), USER, TOMORROW)).resolves.toEqual([])
  })

  it('returns seeded rows sorted by name', async () => {
    const todos = await loadDay(db.asDb(), USER, TOMORROW)
    expect(todos.map(t => t.item_name)).toEqual(['Gym', 'Read'])
  })
})

describe('addItemToUpcomingDays', () => {
  it('adds to every initialised day from today onward', async () => {
    seed('daily_schedule_status', [
      { user_id: USER, schedule_date: YESTERDAY, is_initialized: true },
      { user_id: USER, schedule_date: TODAY, is_initialized: true },
      { user_id: USER, schedule_date: TOMORROW, is_initialized: true },
    ])

    await addItemToUpcomingDays(db.asDb(), USER, 'yoga', 'Yoga')

    expect(db.rows('daily_todos').map(r => r.todo_date).sort()).toEqual([TODAY, TOMORROW])
  })

  it('never back-fills history', async () => {
    seed('daily_schedule_status', [{ user_id: USER, schedule_date: YESTERDAY, is_initialized: true }])
    await addItemToUpcomingDays(db.asDb(), USER, 'yoga', 'Yoga')

    expect(db.rows('daily_todos')).toHaveLength(0)
  })

  it('includes today when it has rows but no status record yet', async () => {
    seed('daily_todos', [makeDailyTodo({ todo_date: TODAY, item_key: 'read' })])
    await addItemToUpcomingDays(db.asDb(), USER, 'yoga', 'Yoga')

    expect(db.rows('daily_todos').filter(r => r.item_key === 'yoga')).toHaveLength(1)
  })

  it('does not create a day that has never been opened', async () => {
    await addItemToUpcomingDays(db.asDb(), USER, 'yoga', 'Yoga')
    expect(db.rows('daily_todos')).toHaveLength(0)
  })

  it('does not double-add when today is both flagged and populated', async () => {
    seed('daily_todos', [makeDailyTodo({ todo_date: TODAY, item_key: 'read' })])
    seed('daily_schedule_status', [{ user_id: USER, schedule_date: TODAY, is_initialized: true }])

    await addItemToUpcomingDays(db.asDb(), USER, 'yoga', 'Yoga')

    expect(db.rows('daily_todos').filter(r => r.item_key === 'yoga')).toHaveLength(1)
  })
})

describe('defaultHistoryRange', () => {
  it('covers the trailing 30 days, ending today', () => {
    expect(defaultHistoryRange()).toEqual({ from: '2026-07-05', to: TODAY })
  })

  it('spans exactly 30 days inclusive', () => {
    const { from, to } = defaultHistoryRange()
    const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000
    expect(days + 1).toBe(30)
  })
})
