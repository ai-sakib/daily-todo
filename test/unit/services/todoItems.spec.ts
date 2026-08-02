import { beforeEach, describe, expect, it } from 'vitest'
import {
  createItem,
  deleteItem,
  listActiveItems,
  listItems,
  renameItem,
  setItemActive,
} from '~/services/todoItems'
import { FakeSupabase, makeTodoItem, type Row } from '../../helpers/fakeSupabase'

const USER = 'user-1'
const OTHER = 'user-2'

let db: FakeSupabase

beforeEach(() => {
  db = new FakeSupabase()
})

const seed = (rows: Row[]) => db.tables.todo_items!.push(...rows)

describe('listItems', () => {
  it('returns active and paused items alike, ordered by name', async () => {
    seed([
      makeTodoItem({ item_name: 'Zebra', is_active: true }),
      makeTodoItem({ item_name: 'Apple', is_active: false }),
    ])

    const items = await listItems(db.asDb(), USER)
    expect(items.map(item => item.item_name)).toEqual(['Apple', 'Zebra'])
  })

  it('never leaks another user’s routine', async () => {
    seed([makeTodoItem({ user_id: OTHER, item_name: 'Theirs' })])
    await expect(listItems(db.asDb(), USER)).resolves.toEqual([])
  })

  it('returns an empty array when there is no routine yet', async () => {
    await expect(listItems(db.asDb(), USER)).resolves.toEqual([])
  })

  it('throws when the query fails', async () => {
    db.failNext({ code: '42501', message: 'permission denied' })
    await expect(listItems(db.asDb(), USER)).rejects.toMatchObject({ code: '42501' })
  })
})

describe('listActiveItems', () => {
  it('excludes paused items and orders by display_order', async () => {
    seed([
      makeTodoItem({ item_name: 'Second', is_active: true, display_order: 2 }),
      makeTodoItem({ item_name: 'First', is_active: true, display_order: 1 }),
      makeTodoItem({ item_name: 'Paused', is_active: false, display_order: 0 }),
    ])

    const items = await listActiveItems(db.asDb(), USER)
    expect(items.map(item => item.item_name)).toEqual(['First', 'Second'])
  })
})

describe('createItem', () => {
  it('creates an active item with the given order', async () => {
    const item = await createItem(db.asDb(), {
      userId: USER,
      itemKey: 'read_1',
      name: 'Read',
      displayOrder: 3,
    })

    expect(item).toMatchObject({ item_name: 'Read', item_key: 'read_1', is_active: true, display_order: 3 })
  })

  it('rejects a duplicate item_key for the same user', async () => {
    seed([makeTodoItem({ item_key: 'read_1' })])

    await expect(
      createItem(db.asDb(), { userId: USER, itemKey: 'read_1', name: 'Read', displayOrder: 1 }),
    ).rejects.toMatchObject({ code: '23505' })
  })

  it('allows the same key for a different user', async () => {
    seed([makeTodoItem({ item_key: 'read_1', user_id: OTHER })])

    await expect(
      createItem(db.asDb(), { userId: USER, itemKey: 'read_1', name: 'Read', displayOrder: 1 }),
    ).resolves.toMatchObject({ user_id: USER })
  })
})

describe('renameItem', () => {
  it('renames only the targeted item', async () => {
    seed([makeTodoItem({ id: 'a', item_name: 'Old' }), makeTodoItem({ id: 'b', item_name: 'Keep' })])
    await renameItem(db.asDb(), 'a', 'New')

    const byId = Object.fromEntries(db.rows('todo_items').map(r => [r.id, r.item_name]))
    expect(byId).toEqual({ a: 'New', b: 'Keep' })
  })

  it('throws when the update fails', async () => {
    db.failNext({ code: '42501' })
    await expect(renameItem(db.asDb(), 'a', 'New')).rejects.toMatchObject({ code: '42501' })
  })
})

describe('setItemActive', () => {
  it('pauses an item and reassigns its order', async () => {
    seed([makeTodoItem({ id: 'a', is_active: true, display_order: 1 })])
    await setItemActive(db.asDb(), 'a', false, 5)

    expect(db.rows('todo_items')[0]).toMatchObject({ is_active: false, display_order: 5 })
  })

  it('resumes a paused item', async () => {
    seed([makeTodoItem({ id: 'a', is_active: false, display_order: 9 })])
    await setItemActive(db.asDb(), 'a', true, 1)

    expect(db.rows('todo_items')[0]).toMatchObject({ is_active: true, display_order: 1 })
  })
})

describe('deleteItem', () => {
  it('removes only the targeted item', async () => {
    seed([makeTodoItem({ id: 'a' }), makeTodoItem({ id: 'b' })])
    await deleteItem(db.asDb(), 'a')

    expect(db.rows('todo_items').map(r => r.id)).toEqual(['b'])
  })

  it('is a no-op for an id that does not exist', async () => {
    seed([makeTodoItem({ id: 'a' })])
    await expect(deleteItem(db.asDb(), 'missing')).resolves.toBeUndefined()
    expect(db.rows('todo_items')).toHaveLength(1)
  })
})
