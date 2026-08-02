import type { TodoItem } from '~/types'
import { unwrap, type Db } from './client'

const TABLE = 'todo_items'

/** Every routine item the user owns, active and inactive alike. */
export async function listItems(db: Db, userId: string): Promise<TodoItem[]> {
  const result = await db
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('item_name')

  return (unwrap(result) as TodoItem[]) ?? []
}

/** Only the items that get seeded into new days. */
export async function listActiveItems(db: Db, userId: string): Promise<TodoItem[]> {
  const result = await db
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('display_order')

  return (unwrap(result) as TodoItem[]) ?? []
}

export async function createItem(
  db: Db,
  input: { userId: string; itemKey: string; name: string; displayOrder: number },
): Promise<TodoItem> {
  const result = await db
    .from(TABLE)
    .insert({
      user_id: input.userId,
      item_key: input.itemKey,
      item_name: input.name,
      is_active: true,
      display_order: input.displayOrder,
    })
    .select()
    .single()

  return unwrap(result) as TodoItem
}

export async function renameItem(db: Db, id: string, name: string): Promise<void> {
  unwrap(await db.from(TABLE).update({ item_name: name }).eq('id', id))
}

export async function setItemActive(
  db: Db,
  id: string,
  isActive: boolean,
  displayOrder: number,
): Promise<void> {
  unwrap(await db.from(TABLE).update({ is_active: isActive, display_order: displayOrder }).eq('id', id))
}

export async function deleteItem(db: Db, id: string): Promise<void> {
  unwrap(await db.from(TABLE).delete().eq('id', id))
}
