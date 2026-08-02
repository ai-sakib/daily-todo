import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { FakeSupabase, makeDailyTodo, makeTodoItem } from '../../helpers/fakeSupabase'

const mocks = vi.hoisted(() => ({ db: null as never, user: null as never }))

mockNuxtImport('useSupabaseClient', () => () => mocks.db)
mockNuxtImport('useSupabaseUser', () => () => mocks.user)

const USER = 'user-1'
const TODAY = '2026-08-03'
const TOMORROW = '2026-08-04'

let db: FakeSupabase

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-03T06:00:00.000Z'))

  db = new FakeSupabase()
  mocks.db = db.asDb() as never
  mocks.user = ref({ sub: USER }) as never

  // Toasts live in shared `useState`, so clear them between tests.
  useToast().toasts.value = []
})

afterEach(() => vi.useRealTimers())

const seedRoutine = () => {
  db.tables.todo_items!.push(
    makeTodoItem({ item_key: 'read', item_name: 'Read' }),
    makeTodoItem({ item_key: 'gym', item_name: 'Gym' }),
  )
}

describe('load', () => {
  it('seeds and exposes the day, then stops pending', async () => {
    seedRoutine()
    const board = useDailyBoard(ref(TODAY))

    expect(board.pending.value).toBe(true)
    await board.load()

    expect(board.pending.value).toBe(false)
    expect(board.ordered.value.map(t => t.item_name)).toEqual(['Gym', 'Read'])
    expect(board.error.value).toBeNull()
  })

  it('records an error and empties the board when loading fails', async () => {
    db.failNext({ code: '42501', message: 'permission denied' }, 'select')
    const board = useDailyBoard(ref(TODAY))
    await board.load()

    expect(board.error.value).toBe('permission denied')
    expect(board.ordered.value).toEqual([])
    expect(board.pending.value).toBe(false)
  })

  it('errors when nobody is signed in', async () => {
    mocks.user = ref(null) as never
    db.auth.getClaims = async () => ({ data: null, error: null }) as never

    const board = useDailyBoard(ref(TODAY))
    await board.load()

    expect(board.error.value).toBe('You need to be signed in.')
  })

  it('falls back to the network when the reactive claims have not landed', async () => {
    // The client plugin fills useSupabaseUser() asynchronously; a page that
    // loads on mount can beat it.
    seedRoutine()
    mocks.user = ref(null) as never

    const board = useDailyBoard(ref(TODAY))
    await board.load()

    expect(board.error.value).toBeNull()
    expect(board.ordered.value).toHaveLength(2)
  })

  it('reloads when the date changes', async () => {
    seedRoutine()
    const date = ref(TODAY)
    const board = useDailyBoard(date)
    await board.load()

    date.value = TOMORROW
    await vi.waitFor(() => expect(board.ordered.value[0]!.todo_date).toBe(TOMORROW))
  })
})

describe('derived state', () => {
  beforeEach(async () => {
    db.tables.daily_todos!.push(
      makeDailyTodo({ id: 'a', todo_date: TODAY, item_name: 'Alpha', is_completed: false }),
      makeDailyTodo({ id: 'b', todo_date: TODAY, item_name: 'Beta', is_completed: true, completed_at: '2026-08-03T01:00:00.000Z' }),
      makeDailyTodo({ id: 'c', todo_date: TODAY, item_name: 'Gamma', is_completed: false }),
    )
  })

  it('splits open and done, open first', async () => {
    const board = useDailyBoard(ref(TODAY))
    await board.load()

    expect(board.openTodos.value.map(t => t.id)).toEqual(['a', 'c'])
    expect(board.doneTodos.value.map(t => t.id)).toEqual(['b'])
    expect(board.ordered.value.map(t => t.id)).toEqual(['a', 'c', 'b'])
  })

  it('reports progress', async () => {
    const board = useDailyBoard(ref(TODAY))
    await board.load()

    expect(board.progress.value).toMatchObject({ total: 3, completed: 1, remaining: 2, percentage: 33, isComplete: false })
  })
})

describe('toggle', () => {
  it('updates the UI before the network call resolves', async () => {
    db.tables.daily_todos!.push(makeDailyTodo({ id: 'a', todo_date: TODAY, is_completed: false }))
    const board = useDailyBoard(ref(TODAY))
    await board.load()

    const promise = board.toggle(board.todos.value[0]!)
    expect(board.todos.value[0]!.is_completed).toBe(true) // already flipped
    await promise

    expect(db.rows('daily_todos')[0]!.is_completed).toBe(true)
  })

  it('stamps and clears completed_at', async () => {
    db.tables.daily_todos!.push(makeDailyTodo({ id: 'a', todo_date: TODAY, is_completed: false }))
    const board = useDailyBoard(ref(TODAY))
    await board.load()

    await board.toggle(board.todos.value[0]!)
    expect(board.todos.value[0]!.completed_at).toBe('2026-08-03T06:00:00.000Z')

    await board.toggle(board.todos.value[0]!)
    expect(board.todos.value[0]!.completed_at).toBeNull()
  })

  it('rolls back and warns when the write fails', async () => {
    db.tables.daily_todos!.push(
      makeDailyTodo({ id: 'a', todo_date: TODAY, is_completed: false, completed_at: null }),
    )
    const board = useDailyBoard(ref(TODAY))
    await board.load()

    db.failNext({ code: '42501', message: 'permission denied' }, 'update')
    await board.toggle(board.todos.value[0]!)

    expect(board.todos.value[0]!.is_completed).toBe(false)
    expect(board.todos.value[0]!.completed_at).toBeNull()
    expect(useToast().toasts.value.at(-1)).toMatchObject({ kind: 'error', message: 'permission denied' })
  })

  it('restores the previous timestamp when un-ticking fails', async () => {
    db.tables.daily_todos!.push(
      makeDailyTodo({ id: 'a', todo_date: TODAY, is_completed: true, completed_at: '2026-08-03T01:00:00.000Z' }),
    )
    const board = useDailyBoard(ref(TODAY))
    await board.load()

    db.failNext({ message: 'offline' }, 'update')
    await board.toggle(board.todos.value[0]!)

    expect(board.todos.value[0]).toMatchObject({
      is_completed: true,
      completed_at: '2026-08-03T01:00:00.000Z',
    })
  })
})

describe('add', () => {
  it('appends the item and marks the day initialised', async () => {
    const board = useDailyBoard(ref(TODAY))
    await board.load()

    await expect(board.add('Walk the dog')).resolves.toBe(true)

    expect(board.ordered.value.map(t => t.item_name)).toEqual(['Walk the dog'])
    expect(db.rows('daily_schedule_status')).toHaveLength(1)
  })

  it('trims whitespace', async () => {
    const board = useDailyBoard(ref(TODAY))
    await board.load()
    await board.add('   Walk   ')

    expect(board.ordered.value[0]!.item_name).toBe('Walk')
  })

  it('ignores an empty or whitespace-only name without querying', async () => {
    const board = useDailyBoard(ref(TODAY))
    await board.load()
    const before = db.log.length

    await expect(board.add('')).resolves.toBe(false)
    await expect(board.add('   ')).resolves.toBe(false)
    expect(db.log).toHaveLength(before)
  })

  it('explains a duplicate rather than leaking the Postgres error', async () => {
    const board = useDailyBoard(ref(TODAY))
    await board.load()
    db.failNext({ code: '23505' }, 'insert')

    await expect(board.add('Walk')).resolves.toBe(false)
    expect(useToast().toasts.value.at(-1)).toMatchObject({
      kind: 'error',
      message: 'That item is already on this day.',
    })
  })

  it('leaves the board untouched when the insert fails', async () => {
    const board = useDailyBoard(ref(TODAY))
    await board.load()
    db.failNext({ message: 'offline' }, 'insert')

    await board.add('Walk')
    expect(board.ordered.value).toEqual([])
  })
})

describe('rename', () => {
  beforeEach(() => {
    db.tables.daily_todos!.push(makeDailyTodo({ id: 'a', todo_date: TODAY, item_name: 'Old' }))
  })

  it('renames optimistically', async () => {
    const board = useDailyBoard(ref(TODAY))
    await board.load()

    await expect(board.rename(board.todos.value[0]!, 'New')).resolves.toBe(true)
    expect(db.rows('daily_todos')[0]!.item_name).toBe('New')
  })

  it('skips a no-op or blank rename', async () => {
    const board = useDailyBoard(ref(TODAY))
    await board.load()
    const before = db.log.length

    await expect(board.rename(board.todos.value[0]!, 'Old')).resolves.toBe(false)
    await expect(board.rename(board.todos.value[0]!, '  ')).resolves.toBe(false)
    expect(db.log).toHaveLength(before)
  })

  it('rolls back to the previous name on failure', async () => {
    const board = useDailyBoard(ref(TODAY))
    await board.load()
    db.failNext({ message: 'offline' }, 'update')

    await expect(board.rename(board.todos.value[0]!, 'New')).resolves.toBe(false)
    expect(board.todos.value[0]!.item_name).toBe('Old')
  })
})

describe('remove', () => {
  it('removes optimistically and confirms', async () => {
    db.tables.daily_todos!.push(makeDailyTodo({ id: 'a', todo_date: TODAY, item_name: 'Walk' }))
    const board = useDailyBoard(ref(TODAY))
    await board.load()

    await board.remove(board.todos.value[0]!)

    expect(board.ordered.value).toEqual([])
    expect(db.rows('daily_todos')).toHaveLength(0)
    expect(useToast().toasts.value.at(-1)).toMatchObject({ kind: 'success' })
  })

  it('restores the item when the delete fails', async () => {
    db.tables.daily_todos!.push(makeDailyTodo({ id: 'a', todo_date: TODAY, item_name: 'Walk' }))
    const board = useDailyBoard(ref(TODAY))
    await board.load()

    db.failNext({ message: 'offline' }, 'delete')
    await board.remove(board.todos.value[0]!)

    expect(board.ordered.value.map(t => t.item_name)).toEqual(['Walk'])
    expect(useToast().toasts.value.at(-1)).toMatchObject({ kind: 'error' })
  })
})

describe('syncRoutine', () => {
  it('pulls in routine items missing from the day', async () => {
    const board = useDailyBoard(ref(TOMORROW))
    await board.load()
    seedRoutine()

    await board.syncRoutine()

    expect(board.ordered.value.map(t => t.item_name).sort()).toEqual(['Gym', 'Read'])
    expect(useToast().toasts.value.at(-1)).toMatchObject({ message: 'Added 2 routine items' })
  })

  it('uses the singular for one item', async () => {
    const board = useDailyBoard(ref(TOMORROW))
    await board.load()
    db.tables.todo_items!.push(makeTodoItem({ item_key: 'read', item_name: 'Read' }))

    await board.syncRoutine()
    expect(useToast().toasts.value.at(-1)).toMatchObject({ message: 'Added 1 routine item' })
  })

  it('says so when there is nothing to add', async () => {
    seedRoutine()
    const board = useDailyBoard(ref(TOMORROW))
    await board.load() // seeding already pulled both items in

    await board.syncRoutine()
    expect(useToast().toasts.value.at(-1)).toMatchObject({ message: 'Already up to date' })
  })

  it('clears the syncing flag even when it fails', async () => {
    const board = useDailyBoard(ref(TOMORROW))
    await board.load()

    db.failNext({ message: 'offline' }, 'select')
    await board.syncRoutine()

    expect(board.syncing.value).toBe(false)
    expect(useToast().toasts.value.at(-1)).toMatchObject({ kind: 'error' })
  })
})
