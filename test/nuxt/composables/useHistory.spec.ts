import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { FakeSupabase, makeDailyTodo } from '../../helpers/fakeSupabase'

const mocks = vi.hoisted(() => ({ db: null as never, user: null as never }))

mockNuxtImport('useSupabaseClient', () => () => mocks.db)
mockNuxtImport('useSupabaseUser', () => () => mocks.user)

const USER = 'user-1'

let db: FakeSupabase

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-03T06:00:00.000Z')) // 2026-08-03 local

  db = new FakeSupabase()
  mocks.db = db.asDb() as never
  mocks.user = ref({ sub: USER }) as never
  useToast().toasts.value = []
})

afterEach(() => vi.useRealTimers())

const perfectDay = (date: string) => [
  makeDailyTodo({ todo_date: date, is_completed: true }),
  makeDailyTodo({ todo_date: date, is_completed: true }),
]

describe('grouping', () => {
  it('groups rows by day, newest first', async () => {
    db.tables.daily_todos!.push(
      makeDailyTodo({ todo_date: '2026-08-01' }),
      makeDailyTodo({ todo_date: '2026-08-03' }),
      makeDailyTodo({ todo_date: '2026-08-02' }),
    )

    const history = useHistory()
    await history.load()

    expect(history.days.value.map(day => day.date)).toEqual(['2026-08-03', '2026-08-02', '2026-08-01'])
  })

  it('computes per-day progress', async () => {
    db.tables.daily_todos!.push(
      makeDailyTodo({ todo_date: '2026-08-02', is_completed: true }),
      makeDailyTodo({ todo_date: '2026-08-02', is_completed: false }),
    )

    const history = useHistory()
    await history.load()

    expect(history.days.value[0]!.progress).toMatchObject({ total: 2, completed: 1, percentage: 50 })
  })

  it('is empty when the range holds nothing', async () => {
    const history = useHistory()
    await history.load()

    expect(history.days.value).toEqual([])
    expect(history.summary.value.tracked).toBe(0)
  })
})

describe('summary', () => {
  it('rolls up tracked days, perfect days, average and streak', async () => {
    db.tables.daily_todos!.push(
      ...perfectDay('2026-08-03'),
      ...perfectDay('2026-08-02'),
      makeDailyTodo({ todo_date: '2026-08-01', is_completed: true }),
      makeDailyTodo({ todo_date: '2026-08-01', is_completed: false }),
    )

    const history = useHistory()
    await history.load()

    expect(history.summary.value).toMatchObject({
      tracked: 3,
      perfect: 2,
      completed: 5,
      average: 83, // (100 + 100 + 50) / 3
      streak: 2,
    })
  })

  it('reports a zero average rather than dividing by zero', async () => {
    const history = useHistory()
    await history.load()
    expect(history.summary.value.average).toBe(0)
  })
})

describe('range', () => {
  beforeEach(() => {
    db.tables.daily_todos!.push(
      makeDailyTodo({ todo_date: '2026-08-03' }),
      makeDailyTodo({ todo_date: '2026-07-20' }),
      makeDailyTodo({ todo_date: '2026-05-01' }),
    )
  })

  it('defaults to the trailing 30 days', async () => {
    const history = useHistory()
    await history.load()

    expect(history.range.value).toEqual({ from: '2026-07-05', to: '2026-08-03' })
    expect(history.days.value.map(d => d.date)).toEqual(['2026-08-03', '2026-07-20'])
  })

  it('applies an explicit range', async () => {
    const history = useHistory()
    await history.setRange('2026-05-01', '2026-05-31')

    expect(history.days.value.map(d => d.date)).toEqual(['2026-05-01'])
  })

  it('applies a preset window inclusive of today', async () => {
    const history = useHistory()
    await history.setLastDays(7)

    expect(history.range.value).toEqual({ from: '2026-07-28', to: '2026-08-03' })
  })

  it('resets back to the default window', async () => {
    const history = useHistory()
    await history.setRange('2026-05-01', '2026-05-31')
    await history.reset()

    expect(history.range.value).toEqual({ from: '2026-07-05', to: '2026-08-03' })
  })

  it('surfaces a load failure and clears the rows', async () => {
    db.failNext({ message: 'offline' }, 'select')
    const history = useHistory()
    await history.load()

    expect(history.error.value).toBe('offline')
    expect(history.days.value).toEqual([])
    expect(history.pending.value).toBe(false)
  })
})

describe('editing history', () => {
  beforeEach(() => {
    db.tables.daily_todos!.push(
      makeDailyTodo({ id: 'a', todo_date: '2026-08-02', is_completed: false }),
      makeDailyTodo({ id: 'b', todo_date: '2026-08-02', is_completed: false }),
    )
  })

  it('toggles a past item and updates the roll-up', async () => {
    const history = useHistory()
    await history.load()

    await history.toggle(history.days.value[0]!.todos[0]!)

    expect(db.rows('daily_todos').find(r => r.id === 'a')!.is_completed).toBe(true)
    expect(history.summary.value.completed).toBe(1)
  })

  it('rolls back a failed toggle', async () => {
    const history = useHistory()
    await history.load()
    db.failNext({ message: 'offline' }, 'update')

    await history.toggle(history.days.value[0]!.todos[0]!)

    expect(history.summary.value.completed).toBe(0)
    expect(useToast().toasts.value.at(-1)).toMatchObject({ kind: 'error' })
  })

  it('deletes an item from history', async () => {
    const history = useHistory()
    await history.load()

    await history.remove(history.days.value[0]!.todos[0]!)

    expect(db.rows('daily_todos')).toHaveLength(1)
    expect(history.days.value[0]!.todos).toHaveLength(1)
  })

  it('drops the day entirely once its last item is deleted', async () => {
    const history = useHistory()
    await history.load()

    await history.remove(history.days.value[0]!.todos[0]!)
    await history.remove(history.days.value[0]!.todos[0]!)

    expect(history.days.value).toEqual([])
  })

  it('restores the item when the delete fails', async () => {
    const history = useHistory()
    await history.load()
    db.failNext({ message: 'offline' }, 'delete')

    await history.remove(history.days.value[0]!.todos[0]!)

    expect(history.days.value[0]!.todos).toHaveLength(2)
  })
})

describe('useStreak', () => {
  it('counts consecutive perfect days ending today', async () => {
    db.tables.daily_todos!.push(...perfectDay('2026-08-03'), ...perfectDay('2026-08-02'))

    const { streak, load } = useStreak()
    await load()

    expect(streak.value).toBe(2)
  })

  it('stays at zero rather than throwing when the query fails', async () => {
    db.failNext({ message: 'offline' }, 'select')
    const { streak, load } = useStreak()
    await load()

    expect(streak.value).toBe(0)
  })

  it('stays at zero when nobody is signed in', async () => {
    mocks.user = ref(null) as never
    db.auth.getClaims = async () => ({ data: null, error: null }) as never

    const { streak, load } = useStreak()
    await load()

    expect(streak.value).toBe(0)
  })
})
