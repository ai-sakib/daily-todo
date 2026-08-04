import type { Db } from '~/services/client'

/**
 * A small in-memory stand-in for the Supabase client.
 *
 * It models the query builder well enough for this app — filters, ordering,
 * projection, insert/update/delete/upsert and unique constraints — so service
 * tests assert on real resulting state instead of canned responses. Anything
 * the app does not use is deliberately absent: an unsupported call should fail
 * loudly rather than silently pass.
 */

export type Row = Record<string, unknown>

export interface PostgrestErrorLike {
  code: string
  message: string
  details?: string
}

type FilterOp = 'eq' | 'gte' | 'lte'
type Filter = [FilterOp, string, unknown]

/** Unique constraints, so duplicate inserts raise 23505 like Postgres does. */
const UNIQUE_KEYS: Record<string, string[]> = {
  profiles: ['id'],
  todo_items: ['user_id', 'item_key'],
  daily_todos: ['user_id', 'todo_date', 'item_key'],
  daily_schedule_status: ['user_id', 'schedule_date'],
}

const DEFAULTS: Record<string, () => Row> = {
  profiles: () => ({
    status: 'pending',
    is_admin: false,
    full_name: null,
    avatar_url: null,
    created_at: new Date().toISOString(),
    decided_at: null,
    decided_by: null,
  }),
  todo_items: () => ({ is_active: true, display_order: 0, created_at: new Date().toISOString() }),
  daily_todos: () => ({
    is_completed: false,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }),
  daily_schedule_status: () => ({ is_initialized: false }),
}

function compare(a: unknown, b: unknown): number {
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b)
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (a === b) return 0
  return String(a) < String(b) ? -1 : 1
}

function matches(row: Row, filters: Filter[]): boolean {
  return filters.every(([op, column, value]) => {
    const actual = row[column]
    if (op === 'eq') return actual === value
    if (op === 'gte') return compare(actual, value) >= 0
    return compare(actual, value) <= 0
  })
}

function project(row: Row, columns: string): Row {
  if (columns.trim() === '*') return { ...row }
  const wanted = columns.split(',').map(part => part.trim()).filter(Boolean)
  return Object.fromEntries(wanted.map(column => [column, row[column]]))
}

export class FakeSupabase {
  /** Table name → rows. Inspect or seed directly in tests. */
  readonly tables: Record<string, Row[]> = {
    profiles: [],
    todo_items: [],
    daily_todos: [],
    daily_schedule_status: [],
  }

  /** Every operation performed, for asserting on query counts. */
  readonly log: { table: string; op: string }[] = []

  /** Errors queued by `failNext`, consumed one per matching operation. */
  private queuedFailures: { op: string | null; error: PostgrestErrorLike }[] = []

  private idCounter = 0

  auth = {
    // Overridden per test when the reactive user state is deliberately empty.
    getClaims: async () => ({ data: { claims: { sub: 'user-1' } }, error: null }),
  }

  constructor(seed: Partial<Record<string, Row[]>> = {}) {
    for (const [table, rows] of Object.entries(seed)) {
      this.tables[table] = (rows ?? []).map(row => ({ ...row }))
    }
  }

  /** Force the next operation (optionally only of a given kind) to fail. */
  failNext(error: Partial<PostgrestErrorLike> = {}, op: string | null = null) {
    this.queuedFailures.push({
      op,
      error: { code: error.code ?? '500', message: error.message ?? 'boom', details: error.details },
    })
  }

  nextId(prefix = 'row') {
    this.idCounter += 1
    return `${prefix}-${this.idCounter}`
  }

  takeFailure(op: string): PostgrestErrorLike | null {
    const index = this.queuedFailures.findIndex(entry => entry.op === null || entry.op === op)
    if (index === -1) return null
    return this.queuedFailures.splice(index, 1)[0]!.error
  }

  rows(table: string): Row[] {
    this.tables[table] ??= []
    return this.tables[table]!
  }

  countOps(table: string, op: string): number {
    return this.log.filter(entry => entry.table === table && entry.op === op).length
  }

  from(table: string) {
    return new FakeQueryBuilder(this, table)
  }

  /** Cast helper so tests can hand this to services typed against `Db`. */
  asDb(): Db {
    return this as unknown as Db
  }
}

class FakeQueryBuilder {
  private filters: Filter[] = []
  private orders: { column: string; ascending: boolean }[] = []
  private columns = '*'
  private mode: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
  private payload: Row[] = []
  private returning = false
  private cardinality: 'many' | 'one' | 'maybeOne' = 'many'
  private conflictColumns: string[] = []

  constructor(private db: FakeSupabase, private table: string) {}

  select(columns = '*') {
    if (this.mode === 'select') this.columns = columns
    else this.returning = true
    return this
  }

  insert(values: Row | Row[]) {
    this.mode = 'insert'
    this.payload = Array.isArray(values) ? values : [values]
    return this
  }

  update(values: Row) {
    this.mode = 'update'
    this.payload = [values]
    return this
  }

  upsert(values: Row | Row[], options?: { onConflict?: string }) {
    this.mode = 'upsert'
    this.payload = Array.isArray(values) ? values : [values]
    this.conflictColumns = (options?.onConflict ?? '')
      .split(',')
      .map(part => part.trim())
      .filter(Boolean)
    return this
  }

  delete() {
    this.mode = 'delete'
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push(['eq', column, value])
    return this
  }

  gte(column: string, value: unknown) {
    this.filters.push(['gte', column, value])
    return this
  }

  lte(column: string, value: unknown) {
    this.filters.push(['lte', column, value])
    return this
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending ?? true })
    return this
  }

  single() {
    this.cardinality = 'one'
    return this
  }

  maybeSingle() {
    this.cardinality = 'maybeOne'
    return this
  }

  // The builder is thenable, so `await db.from(...)...` resolves here.
  then<TResult1 = { data: unknown; error: unknown }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected)
  }

  private duplicateOf(candidate: Row): boolean {
    const keys = UNIQUE_KEYS[this.table]
    if (!keys) return false
    return this.db
      .rows(this.table)
      .some(existing => keys.every(key => existing[key] === candidate[key]))
  }

  private run(): { data: unknown; error: unknown } {
    this.db.log.push({ table: this.table, op: this.mode })

    const failure = this.db.takeFailure(this.mode)
    if (failure) return { data: null, error: failure }

    switch (this.mode) {
      case 'select':
        return this.runSelect()
      case 'insert':
        return this.runInsert()
      case 'update':
        return this.runUpdate()
      case 'upsert':
        return this.runUpsert()
      case 'delete':
        return this.runDelete()
    }
  }

  private shape(rows: Row[]): { data: unknown; error: unknown } {
    if (this.cardinality === 'many') return { data: rows, error: null }

    if (rows.length === 0) {
      if (this.cardinality === 'maybeOne') return { data: null, error: null }
      return {
        data: null,
        error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' },
      }
    }
    return { data: rows[0]!, error: null }
  }

  private runSelect() {
    const rows = this.db
      .rows(this.table)
      .filter(row => matches(row, this.filters))
      .map(row => project(row, this.columns))

    for (const { column, ascending } of [...this.orders].reverse()) {
      rows.sort((a, b) => (ascending ? 1 : -1) * compare(a[column], b[column]))
    }

    return this.shape(rows)
  }

  private runInsert() {
    const inserted: Row[] = []

    for (const values of this.payload) {
      const row: Row = {
        id: this.db.nextId(this.table),
        ...DEFAULTS[this.table]?.(),
        ...values,
      }

      if (this.duplicateOf(row)) {
        return {
          data: null,
          error: {
            code: '23505',
            message: `duplicate key value violates unique constraint on ${this.table}`,
          },
        }
      }

      this.db.rows(this.table).push(row)
      inserted.push(row)
    }

    if (!this.returning) return { data: null, error: null }
    return this.shape(inserted)
  }

  private runUpdate() {
    const patch = this.payload[0] ?? {}
    const updated: Row[] = []

    for (const row of this.db.rows(this.table)) {
      if (!matches(row, this.filters)) continue
      Object.assign(row, patch)
      updated.push(row)
    }

    if (!this.returning) return { data: null, error: null }
    return this.shape(updated)
  }

  private runUpsert() {
    const affected: Row[] = []

    for (const values of this.payload) {
      const keys = this.conflictColumns.length > 0 ? this.conflictColumns : UNIQUE_KEYS[this.table] ?? []
      const existing = this.db
        .rows(this.table)
        .find(row => keys.length > 0 && keys.every(key => row[key] === values[key]))

      if (existing) {
        Object.assign(existing, values)
        affected.push(existing)
      } else {
        const row: Row = { id: this.db.nextId(this.table), ...DEFAULTS[this.table]?.(), ...values }
        this.db.rows(this.table).push(row)
        affected.push(row)
      }
    }

    if (!this.returning) return { data: null, error: null }
    return this.shape(affected)
  }

  private runDelete() {
    const remaining: Row[] = []
    const removed: Row[] = []

    for (const row of this.db.rows(this.table)) {
      if (matches(row, this.filters)) removed.push(row)
      else remaining.push(row)
    }

    this.db.tables[this.table] = remaining
    if (!this.returning) return { data: null, error: null }
    return this.shape(removed)
  }
}

/* ------------------------------------------------------------------ factories */

let sequence = 0

export function makeDailyTodo(overrides: Row = {}): Row {
  sequence += 1
  return {
    id: `daily-${sequence}`,
    user_id: 'user-1',
    todo_date: '2026-08-03',
    item_key: `item_${sequence}`,
    item_name: `Item ${sequence}`,
    is_completed: false,
    completed_at: null,
    created_at: '2026-08-03T00:00:00.000Z',
    updated_at: '2026-08-03T00:00:00.000Z',
    ...overrides,
  }
}

export function makeProfile(overrides: Row = {}): Row {
  sequence += 1
  return {
    id: `user-${sequence}`,
    email: `person${sequence}@example.com`,
    full_name: `Person ${sequence}`,
    avatar_url: null,
    status: 'pending',
    is_admin: false,
    created_at: '2026-08-01T00:00:00.000Z',
    decided_at: null,
    decided_by: null,
    ...overrides,
  }
}

export function makeTodoItem(overrides: Row = {}): Row {
  sequence += 1
  return {
    id: `item-${sequence}`,
    user_id: 'user-1',
    item_key: `item_${sequence}`,
    item_name: `Routine ${sequence}`,
    is_active: true,
    display_order: sequence,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}
