import type { DailyTodo, DateKey } from '~/types'
import * as dailyTodos from '~/services/dailyTodos'
import { calculateProgress, createItemKey, errorMessage, sortForBoard } from '~/utils/todo'

/**
 * One day's todo board — used by both the Today page and the date planner.
 *
 * Mutations are optimistic: local state changes immediately and rolls back if
 * the write fails, so ticking a box never waits on the network.
 */
export function useDailyBoard(date: Ref<DateKey>) {
  const db = useSupabaseClient()
  const { resolveUserId } = useAuth()
  const toast = useToast()

  const todos = ref<DailyTodo[]>([])
  const pending = ref(true)
  const syncing = ref(false)
  const error = ref<string | null>(null)

  const ordered = computed(() => sortForBoard(todos.value))
  const openTodos = computed(() => ordered.value.filter(todo => !todo.is_completed))
  const doneTodos = computed(() => ordered.value.filter(todo => todo.is_completed))
  const progress = computed(() => calculateProgress(todos.value))

  function replace(id: string, patch: Partial<DailyTodo>) {
    todos.value = todos.value.map(todo => (todo.id === id ? { ...todo, ...patch } : todo))
  }

  async function load() {
    pending.value = true
    error.value = null
    try {
      todos.value = await dailyTodos.loadDay(db, await resolveUserId(), date.value)
    } catch (err) {
      error.value = errorMessage(err, 'Could not load this day.')
      todos.value = []
    } finally {
      pending.value = false
    }
  }

  async function toggle(todo: DailyTodo) {
    const next = !todo.is_completed
    const snapshot = { is_completed: todo.is_completed, completed_at: todo.completed_at }

    replace(todo.id, {
      is_completed: next,
      completed_at: next ? new Date().toISOString() : null,
    })

    try {
      await dailyTodos.setCompleted(db, todo.id, next)
    } catch (err) {
      replace(todo.id, snapshot)
      toast.error(errorMessage(err, 'Could not update that item.'))
    }
  }

  async function add(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return false

    try {
      const userId = await resolveUserId()
      const created = await dailyTodos.addTodo(db, {
        userId,
        date: date.value,
        name: trimmed,
        itemKey: createItemKey(trimmed),
      })
      todos.value = [...todos.value, created]
      await dailyTodos.markDayInitialized(db, userId, date.value)
      return true
    } catch (err) {
      toast.error(errorMessage(err, 'Could not add that item.'))
      return false
    }
  }

  async function rename(todo: DailyTodo, name: string) {
    const trimmed = name.trim()
    if (!trimmed || trimmed === todo.item_name) return false

    const previous = todo.item_name
    replace(todo.id, { item_name: trimmed })

    try {
      await dailyTodos.renameTodo(db, todo.id, trimmed)
      return true
    } catch (err) {
      replace(todo.id, { item_name: previous })
      toast.error(errorMessage(err, 'Could not rename that item.'))
      return false
    }
  }

  async function remove(todo: DailyTodo) {
    const snapshot = todos.value
    todos.value = todos.value.filter(item => item.id !== todo.id)

    try {
      await dailyTodos.deleteTodo(db, todo.id)
      toast.success(`Removed “${todo.item_name}”`)
    } catch (err) {
      todos.value = snapshot
      toast.error(errorMessage(err, 'Could not remove that item.'))
    }
  }

  /** Pulls in routine items added after this day was first prepared. */
  async function syncRoutine() {
    syncing.value = true
    try {
      const inserted = await dailyTodos.syncRoutineIntoDay(
        db,
        await resolveUserId(),
        date.value,
        todos.value,
      )
      todos.value = [...todos.value, ...inserted]
      toast.success(
        inserted.length > 0
          ? `Added ${inserted.length} routine item${inserted.length === 1 ? '' : 's'}`
          : 'Already up to date',
      )
    } catch (err) {
      toast.error(errorMessage(err, 'Sync failed.'))
    } finally {
      syncing.value = false
    }
  }

  watch(date, load)

  return {
    todos,
    ordered,
    openTodos,
    doneTodos,
    progress,
    pending,
    syncing,
    error,
    load,
    toggle,
    add,
    rename,
    remove,
    syncRoutine,
  }
}
