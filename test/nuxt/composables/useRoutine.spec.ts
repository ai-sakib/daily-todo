import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { TodoItem } from '~/types'
import { FakeSupabase, makeDailyTodo, makeTodoItem } from '../../helpers/fakeSupabase'

const mocks = vi.hoisted(() => ({ db: null as never, user: null as never }))

mockNuxtImport('useSupabaseClient', () => () => mocks.db)
mockNuxtImport('useSupabaseUser', () => () => mocks.user)

const USER = 'user-1'
const TODAY = '2026-08-03'
const YESTERDAY = '2026-08-02'
const TOMORROW = '2026-08-04'

let db: FakeSupabase

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-03T06:00:00.000Z'))

  db = new FakeSupabase()
  mocks.db = db.asDb() as never
  mocks.user = ref({ sub: USER }) as never
  useToast().toasts.value = []
})

afterEach(() => vi.useRealTimers())

const lastToast = () => useToast().toasts.value.at(-1)

describe('load', () => {
  it('splits active and paused items', async () => {
    db.tables.todo_items!.push(
      makeTodoItem({ item_name: 'Active', is_active: true }),
      makeTodoItem({ item_name: 'Paused', is_active: false }),
    )

    const routine = useRoutine()
    await routine.load()

    expect(routine.activeItems.value.map(i => i.item_name)).toEqual(['Active'])
    expect(routine.inactiveItems.value.map(i => i.item_name)).toEqual(['Paused'])
    expect(routine.pending.value).toBe(false)
  })

  it('surfaces a load failure', async () => {
    db.failNext({ message: 'offline' }, 'select')
    const routine = useRoutine()
    await routine.load()

    expect(routine.error.value).toBe('offline')
  })
})

describe('add', () => {
  it('creates the item and orders it after existing active ones', async () => {
    db.tables.todo_items!.push(makeTodoItem({ is_active: true, display_order: 4 }))
    const routine = useRoutine()
    await routine.load()

    await expect(routine.add('Read')).resolves.toBe(true)

    const created = db.rows('todo_items').find(r => r.item_name === 'Read')!
    expect(created.display_order).toBe(5)
    expect(created.is_active).toBe(true)
  })

  it('fans the new item out to today and prepared future days', async () => {
    db.tables.daily_schedule_status!.push(
      { user_id: USER, schedule_date: TODAY, is_initialized: true },
      { user_id: USER, schedule_date: TOMORROW, is_initialized: true },
      { user_id: USER, schedule_date: YESTERDAY, is_initialized: true },
    )

    const routine = useRoutine()
    await routine.load()
    await routine.add('Read')

    expect(db.rows('daily_todos').map(r => r.todo_date).sort()).toEqual([TODAY, TOMORROW])
  })

  it('rejects blank names without querying', async () => {
    const routine = useRoutine()
    await routine.load()
    const before = db.log.length

    await expect(routine.add('   ')).resolves.toBe(false)
    expect(db.log).toHaveLength(before)
  })

  it('clears the saving flag after a failure', async () => {
    const routine = useRoutine()
    await routine.load()
    db.failNext({ message: 'offline' }, 'insert')

    await expect(routine.add('Read')).resolves.toBe(false)
    expect(routine.saving.value).toBe(false)
    expect(lastToast()).toMatchObject({ kind: 'error' })
  })
})

describe('rename', () => {
  beforeEach(() => {
    db.tables.todo_items!.push(makeTodoItem({ id: 'a', item_key: 'read', item_name: 'Read' }))
    db.tables.daily_todos!.push(
      makeDailyTodo({ id: 'past', todo_date: YESTERDAY, item_key: 'read', item_name: 'Read' }),
      makeDailyTodo({ id: 'today', todo_date: TODAY, item_key: 'read', item_name: 'Read' }),
    )
  })

  it('renames the routine and today onward, but not history', async () => {
    const routine = useRoutine()
    await routine.load()

    await expect(routine.rename(routine.items.value[0]!, 'Read a book')).resolves.toBe(true)

    const byId = Object.fromEntries(db.rows('daily_todos').map(r => [r.id, r.item_name]))
    expect(byId.today).toBe('Read a book')
    expect(byId.past).toBe('Read')
    expect(db.rows('todo_items')[0]!.item_name).toBe('Read a book')
  })

  it('skips a no-op rename', async () => {
    const routine = useRoutine()
    await routine.load()
    const before = db.log.length

    await expect(routine.rename(routine.items.value[0]!, 'Read')).resolves.toBe(false)
    expect(db.log).toHaveLength(before)
  })

  it('rolls the list back when the write fails', async () => {
    const routine = useRoutine()
    await routine.load()
    db.failNext({ message: 'offline' }, 'update')

    await expect(routine.rename(routine.items.value[0]!, 'New')).resolves.toBe(false)
    expect(routine.items.value[0]!.item_name).toBe('Read')
  })
})

describe('setActive', () => {
  beforeEach(() => {
    db.tables.todo_items!.push(makeTodoItem({ id: 'a', item_key: 'read', item_name: 'Read', is_active: true }))
  })

  it('pausing strips the item from today and the future, keeping history', async () => {
    db.tables.daily_todos!.push(
      makeDailyTodo({ id: 'past', todo_date: YESTERDAY, item_key: 'read' }),
      makeDailyTodo({ id: 'today', todo_date: TODAY, item_key: 'read' }),
      makeDailyTodo({ id: 'future', todo_date: TOMORROW, item_key: 'read' }),
    )

    const routine = useRoutine()
    await routine.load()
    await routine.setActive(routine.items.value[0] as TodoItem, false)

    expect(db.rows('daily_todos').map(r => r.id)).toEqual(['past'])
    expect(routine.inactiveItems.value).toHaveLength(1)
  })

  it('resuming puts the item back on prepared days', async () => {
    db.tables.todo_items![0]!.is_active = false
    db.tables.daily_schedule_status!.push({ user_id: USER, schedule_date: TODAY, is_initialized: true })

    const routine = useRoutine()
    await routine.load()
    await routine.setActive(routine.items.value[0] as TodoItem, true)

    expect(db.rows('daily_todos')).toHaveLength(1)
    expect(routine.activeItems.value).toHaveLength(1)
  })

  it('rolls back the local flag when the write fails', async () => {
    const routine = useRoutine()
    await routine.load()
    db.failNext({ message: 'offline' }, 'update')

    await routine.setActive(routine.items.value[0] as TodoItem, false)

    expect(routine.items.value[0]!.is_active).toBe(true)
    expect(lastToast()).toMatchObject({ kind: 'error' })
  })
})

describe('remove', () => {
  it('deletes the routine item and its upcoming days, keeping history', async () => {
    db.tables.todo_items!.push(makeTodoItem({ id: 'a', item_key: 'read', item_name: 'Read' }))
    db.tables.daily_todos!.push(
      makeDailyTodo({ id: 'past', todo_date: YESTERDAY, item_key: 'read' }),
      makeDailyTodo({ id: 'today', todo_date: TODAY, item_key: 'read' }),
    )

    const routine = useRoutine()
    await routine.load()
    await routine.remove(routine.items.value[0] as TodoItem)

    expect(db.rows('todo_items')).toHaveLength(0)
    expect(db.rows('daily_todos').map(r => r.id)).toEqual(['past'])
    expect(routine.items.value).toEqual([])
  })

  it('restores the item when the delete fails', async () => {
    db.tables.todo_items!.push(makeTodoItem({ id: 'a', item_name: 'Read' }))
    const routine = useRoutine()
    await routine.load()

    db.failNext({ message: 'offline' }, 'delete')
    await routine.remove(routine.items.value[0] as TodoItem)

    expect(routine.items.value).toHaveLength(1)
    expect(lastToast()).toMatchObject({ kind: 'error' })
  })
})
