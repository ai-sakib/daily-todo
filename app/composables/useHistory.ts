import type { DailyTodo, DateKey, HistoryDay } from '~/types'
import * as dailyTodos from '~/services/dailyTodos'
import { calculateProgress, calculateStreak, errorMessage } from '~/utils/todo'

/** Past days grouped by date, with roll-up stats across the selected range. */
export function useHistory() {
  const db = useSupabaseClient()
  const { resolveUserId } = useAuth()
  const toast = useToast()

  const defaults = dailyTodos.defaultHistoryRange()
  const range = ref<{ from: DateKey; to: DateKey }>({ ...defaults })
  const rows = ref<DailyTodo[]>([])
  const pending = ref(true)
  const error = ref<string | null>(null)

  const days = computed<HistoryDay[]>(() => {
    const grouped = new Map<DateKey, DailyTodo[]>()
    for (const row of rows.value) {
      const bucket = grouped.get(row.todo_date)
      if (bucket) bucket.push(row)
      else grouped.set(row.todo_date, [row])
    }

    return [...grouped.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, todos]) => ({ date, todos, progress: calculateProgress(todos) }))
  })

  const summary = computed(() => {
    const tracked = days.value.length
    const perfect = days.value.filter(day => day.progress.isComplete).length
    const completed = rows.value.filter(row => row.is_completed).length
    const average = tracked === 0
      ? 0
      : Math.round(days.value.reduce((sum, day) => sum + day.progress.percentage, 0) / tracked)

    return {
      tracked,
      perfect,
      completed,
      average,
      streak: calculateStreak(rows.value),
    }
  })

  async function load() {
    pending.value = true
    error.value = null
    try {
      const userId = await resolveUserId()
      rows.value = await dailyTodos.listByRange(db, userId, range.value.from, range.value.to)
    } catch (err) {
      error.value = errorMessage(err, 'Could not load your history.')
      rows.value = []
    } finally {
      pending.value = false
    }
  }

  function reset() {
    range.value = dailyTodos.defaultHistoryRange()
    return load()
  }

  function setRange(from: DateKey, to: DateKey) {
    range.value = { from, to }
    return load()
  }

  /** Quick presets for the range picker. */
  function setLastDays(count: number) {
    const to = todayKey()
    return setRange(shiftDateKey(to, -(count - 1)), to)
  }

  async function toggle(todo: DailyTodo) {
    const next = !todo.is_completed
    const snapshot = rows.value

    rows.value = rows.value.map(row =>
      row.id === todo.id
        ? { ...row, is_completed: next, completed_at: next ? new Date().toISOString() : null }
        : row,
    )

    try {
      await dailyTodos.setCompleted(db, todo.id, next)
    } catch (err) {
      rows.value = snapshot
      toast.error(errorMessage(err, 'Could not update that item.'))
    }
  }

  async function remove(todo: DailyTodo) {
    const snapshot = rows.value
    rows.value = rows.value.filter(row => row.id !== todo.id)

    try {
      await dailyTodos.deleteTodo(db, todo.id)
      toast.success('Deleted from history')
    } catch (err) {
      rows.value = snapshot
      toast.error(errorMessage(err, 'Could not delete that item.'))
    }
  }

  return { range, days, summary, pending, error, load, reset, setRange, setLastDays, toggle, remove }
}

/** Lightweight streak lookup for the Today header. */
export function useStreak() {
  const db = useSupabaseClient()
  const { resolveUserId } = useAuth()
  const streak = ref(0)

  async function load() {
    try {
      const userId = await resolveUserId()
      const to = todayKey()
      const flags = await dailyTodos.listCompletionFlags(db, userId, shiftDateKey(to, -90), to)
      streak.value = calculateStreak(flags)
    } catch {
      streak.value = 0
    }
  }

  return { streak, load }
}
