import type { TodoItem } from '~/types'
import * as dailyTodos from '~/services/dailyTodos'
import * as todoItems from '~/services/todoItems'
import { createItemKey, errorMessage } from '~/utils/todo'

/**
 * The reusable routine (`todo_items`) plus the fan-out rules that keep today
 * and future days in step with it. History is never rewritten.
 */
export function useRoutine() {
  const db = useSupabaseClient()
  const { resolveUserId } = useAuth()
  const toast = useToast()

  const items = ref<TodoItem[]>([])
  const pending = ref(true)
  const saving = ref(false)
  const error = ref<string | null>(null)

  const activeItems = computed(() => items.value.filter(item => item.is_active))
  const inactiveItems = computed(() => items.value.filter(item => !item.is_active))

  async function load() {
    pending.value = true
    error.value = null
    try {
      items.value = await todoItems.listItems(db, await resolveUserId())
    } catch (err) {
      error.value = errorMessage(err, 'Could not load your routine.')
    } finally {
      pending.value = false
    }
  }

  async function add(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return false

    saving.value = true
    try {
      const userId = await resolveUserId()
      const itemKey = createItemKey(trimmed)
      const displayOrder = activeItems.value.reduce((max, item) => Math.max(max, item.display_order), 0) + 1

      const created = await todoItems.createItem(db, { userId, itemKey, name: trimmed, displayOrder })
      items.value = [...items.value, created]

      await dailyTodos.addItemToUpcomingDays(db, userId, itemKey, trimmed)
      toast.success(`“${trimmed}” added to your routine`)
      return true
    } catch (err) {
      toast.error(errorMessage(err, 'Could not add that item.'))
      return false
    } finally {
      saving.value = false
    }
  }

  async function rename(item: TodoItem, name: string) {
    const trimmed = name.trim()
    if (!trimmed || trimmed === item.item_name) return false

    const snapshot = items.value
    items.value = items.value.map(i => (i.id === item.id ? { ...i, item_name: trimmed } : i))

    try {
      const userId = await resolveUserId()
      await todoItems.renameItem(db, item.id, trimmed)
      await dailyTodos.renameFutureByKey(db, userId, item.item_key, trimmed)
      toast.success('Renamed here and on upcoming days')
      return true
    } catch (err) {
      items.value = snapshot
      toast.error(errorMessage(err, 'Could not rename that item.'))
      return false
    }
  }

  /**
   * Pausing an item pulls it off today and future days; resuming it puts it
   * back, so the change is visible right away rather than from tomorrow.
   */
  async function setActive(item: TodoItem, isActive: boolean) {
    const snapshot = items.value
    const target = isActive ? activeItems.value : inactiveItems.value
    const displayOrder = target.length + 1

    items.value = items.value.map(i =>
      i.id === item.id ? { ...i, is_active: isActive, display_order: displayOrder } : i,
    )

    try {
      const userId = await resolveUserId()
      await todoItems.setItemActive(db, item.id, isActive, displayOrder)

      if (isActive) {
        await dailyTodos.addItemToUpcomingDays(db, userId, item.item_key, item.item_name)
      } else {
        await dailyTodos.deleteFutureByKey(db, userId, item.item_key)
      }

      toast.success(isActive ? `“${item.item_name}” resumed` : `“${item.item_name}” paused`)
    } catch (err) {
      items.value = snapshot
      toast.error(errorMessage(err, 'Could not save that change.'))
    }
  }

  async function remove(item: TodoItem) {
    const snapshot = items.value
    items.value = items.value.filter(i => i.id !== item.id)

    try {
      const userId = await resolveUserId()
      await todoItems.deleteItem(db, item.id)
      await dailyTodos.deleteFutureByKey(db, userId, item.item_key)
      toast.success(`“${item.item_name}” deleted — history kept`)
    } catch (err) {
      items.value = snapshot
      toast.error(errorMessage(err, 'Could not delete that item.'))
    }
  }

  return {
    items,
    activeItems,
    inactiveItems,
    pending,
    saving,
    error,
    load,
    add,
    rename,
    setActive,
    remove,
  }
}
