/**
 * Row shapes for the three Supabase tables backing the app.
 *
 *  todo_items            – the reusable "routine" definitions a user maintains.
 *  daily_todos           – one concrete instance of an item on one calendar day.
 *  daily_schedule_status – marks a day as already seeded from the routine, so we
 *                          never re-add items the user deliberately removed.
 */

/** A `YYYY-MM-DD` calendar day in the user's local timezone. */
export type DateKey = string

export interface TodoItem {
  id: string
  user_id: string
  item_key: string
  item_name: string
  is_active: boolean
  display_order: number
  created_at: string
}

export interface DailyTodo {
  id: string
  user_id: string
  todo_date: DateKey
  item_key: string
  item_name: string
  is_completed: boolean
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface ScheduleStatus {
  user_id: string
  schedule_date: DateKey
  is_initialized: boolean
}

/** Payload accepted by `daily_todos` inserts. */
export interface NewDailyTodo {
  user_id: string
  todo_date: DateKey
  item_key: string
  item_name: string
  is_completed: boolean
}

export interface DayProgress {
  total: number
  completed: number
  remaining: number
  percentage: number
  isComplete: boolean
}

export interface HistoryDay {
  date: DateKey
  todos: DailyTodo[]
  progress: DayProgress
}

export type ToastKind = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
}

export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}
