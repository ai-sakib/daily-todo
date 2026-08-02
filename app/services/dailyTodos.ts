import type { DailyTodo, DateKey, NewDailyTodo } from '~/types'
import { isPastDate, shiftDateKey, todayKey } from '~/utils/date'
import { unwrap, type Db } from './client'
import { listActiveItems } from './todoItems'

const TABLE = 'daily_todos'
const STATUS_TABLE = 'daily_schedule_status'

// ---------------------------------------------------------------- reads

export async function listByDate(db: Db, userId: string, date: DateKey): Promise<DailyTodo[]> {
  const result = await db
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('todo_date', date)
    .order('item_name')

  return (unwrap(result) as DailyTodo[]) ?? []
}

export async function listByRange(
  db: Db,
  userId: string,
  from: DateKey,
  to: DateKey,
): Promise<DailyTodo[]> {
  const result = await db
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .gte('todo_date', from)
    .lte('todo_date', to)
    .order('todo_date', { ascending: false })
    .order('item_name')

  return (unwrap(result) as DailyTodo[]) ?? []
}

/** Minimal projection used for streak maths — avoids pulling full rows. */
export async function listCompletionFlags(
  db: Db,
  userId: string,
  from: DateKey,
  to: DateKey,
): Promise<Pick<DailyTodo, 'todo_date' | 'is_completed'>[]> {
  const result = await db
    .from(TABLE)
    .select('todo_date, is_completed')
    .eq('user_id', userId)
    .gte('todo_date', from)
    .lte('todo_date', to)

  return (unwrap(result) as Pick<DailyTodo, 'todo_date' | 'is_completed'>[]) ?? []
}

// ---------------------------------------------------------------- writes

export async function insertTodos(db: Db, rows: NewDailyTodo[]): Promise<DailyTodo[]> {
  if (rows.length === 0) return []
  const result = await db.from(TABLE).insert(rows).select()
  return (unwrap(result) as DailyTodo[]) ?? []
}

export async function addTodo(
  db: Db,
  input: { userId: string; date: DateKey; name: string; itemKey: string },
): Promise<DailyTodo> {
  const result = await db
    .from(TABLE)
    .insert({
      user_id: input.userId,
      todo_date: input.date,
      item_name: input.name,
      item_key: input.itemKey,
      is_completed: false,
    })
    .select()
    .single()

  return unwrap(result) as DailyTodo
}

export async function setCompleted(db: Db, id: string, isCompleted: boolean): Promise<void> {
  const now = new Date().toISOString()
  unwrap(
    await db
      .from(TABLE)
      .update({
        is_completed: isCompleted,
        completed_at: isCompleted ? now : null,
        updated_at: now,
      })
      .eq('id', id),
  )
}

export async function renameTodo(db: Db, id: string, name: string): Promise<void> {
  unwrap(
    await db
      .from(TABLE)
      .update({ item_name: name, updated_at: new Date().toISOString() })
      .eq('id', id),
  )
}

export async function deleteTodo(db: Db, id: string): Promise<void> {
  unwrap(await db.from(TABLE).delete().eq('id', id))
}

/**
 * Propagates a routine rename to today and every future day, matched on
 * `item_key`. History is intentionally left untouched so past days keep the
 * name they were completed under.
 */
export async function renameFutureByKey(
  db: Db,
  userId: string,
  itemKey: string,
  name: string,
): Promise<void> {
  unwrap(
    await db
      .from(TABLE)
      .update({ item_name: name, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('item_key', itemKey)
      .gte('todo_date', todayKey()),
  )
}

/** Removes a routine item from today and all future days, keeping history. */
export async function deleteFutureByKey(db: Db, userId: string, itemKey: string): Promise<void> {
  unwrap(
    await db
      .from(TABLE)
      .delete()
      .eq('user_id', userId)
      .eq('item_key', itemKey)
      .gte('todo_date', todayKey()),
  )
}

// ---------------------------------------------------------------- schedule status

export async function isDayInitialized(db: Db, userId: string, date: DateKey): Promise<boolean> {
  const result = await db
    .from(STATUS_TABLE)
    .select('is_initialized')
    .eq('user_id', userId)
    .eq('schedule_date', date)
    .maybeSingle()

  return Boolean((unwrap(result) as { is_initialized: boolean } | null)?.is_initialized)
}

export async function markDayInitialized(db: Db, userId: string, date: DateKey): Promise<void> {
  unwrap(
    await db
      .from(STATUS_TABLE)
      .upsert(
        { user_id: userId, schedule_date: date, is_initialized: true },
        { onConflict: 'user_id, schedule_date' },
      ),
  )
}

/** Days from today onward that already exist, so new routine items reach them. */
export async function listInitializedDatesFrom(
  db: Db,
  userId: string,
  from: DateKey,
): Promise<DateKey[]> {
  const result = await db
    .from(STATUS_TABLE)
    .select('schedule_date')
    .eq('user_id', userId)
    .gte('schedule_date', from)

  const rows = (unwrap(result) as { schedule_date: DateKey }[]) ?? []
  return rows.map(row => row.schedule_date)
}

// ---------------------------------------------------------------- seeding

/**
 * Copies active routine items into a day, skipping any `item_key` already
 * present. Returns the rows that were added.
 */
export async function syncRoutineIntoDay(
  db: Db,
  userId: string,
  date: DateKey,
  existing: DailyTodo[],
): Promise<DailyTodo[]> {
  const items = await listActiveItems(db, userId)
  const presentKeys = new Set(existing.map(todo => todo.item_key))

  const rows: NewDailyTodo[] = items
    .filter(item => !presentKeys.has(item.item_key))
    .map(item => ({
      user_id: userId,
      todo_date: date,
      item_key: item.item_key,
      item_name: item.item_name,
      is_completed: false,
    }))

  const inserted = await insertTodos(db, rows)
  await markDayInitialized(db, userId, date)
  return inserted
}

/**
 * Loads a day, seeding it from the routine the first time it is opened.
 *
 * Two rules keep this safe:
 *  - past days are never seeded, so history stays exactly as it was lived;
 *  - a day that already has rows is marked initialized rather than topped up,
 *    so items the user deleted do not silently reappear.
 */
export async function loadDay(db: Db, userId: string, date: DateKey): Promise<DailyTodo[]> {
  const existing = await listByDate(db, userId, date)

  if (isPastDate(date)) return existing
  if (await isDayInitialized(db, userId, date)) return existing

  if (existing.length > 0) {
    await markDayInitialized(db, userId, date)
    return existing
  }

  const inserted = await syncRoutineIntoDay(db, userId, date, existing)
  return [...existing, ...inserted].sort((a, b) => a.item_name.localeCompare(b.item_name))
}

/** Fans a newly created routine item out to today and any prepared future day. */
export async function addItemToUpcomingDays(
  db: Db,
  userId: string,
  itemKey: string,
  name: string,
): Promise<void> {
  const today = todayKey()
  const dates = await listInitializedDatesFrom(db, userId, today)
  const targets = new Set(dates)

  // Today may not be flagged yet if it was never opened — include it anyway
  // when it already holds rows, so the item shows up immediately.
  if (!targets.has(today) && (await listByDate(db, userId, today)).length > 0) {
    targets.add(today)
  }

  const rows: NewDailyTodo[] = [...targets].map(date => ({
    user_id: userId,
    todo_date: date,
    item_key: itemKey,
    item_name: name,
    is_completed: false,
  }))

  await insertTodos(db, rows)
}

/** Default history window: the trailing 30 days. */
export function defaultHistoryRange(): { from: DateKey; to: DateKey } {
  const to = todayKey()
  return { from: shiftDateKey(to, -29), to }
}
