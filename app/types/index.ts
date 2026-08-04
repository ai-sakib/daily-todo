/**
 * Row shapes for the four Supabase tables backing the app.
 *
 *  profiles              – one row per account, holding its access status.
 *  todo_items            – the reusable "routine" definitions a user maintains.
 *  daily_todos           – one concrete instance of an item on one calendar day.
 *  daily_schedule_status – marks a day as already seeded from the routine, so we
 *                          never re-add items the user deliberately removed.
 */

/** A `YYYY-MM-DD` calendar day in the user's local timezone. */
export type DateKey = string

/**
 * Where an account stands with the owner.
 *
 * Every Google sign-up starts as `pending` and stays out of the app until an
 * admin moves it on; `rejected` is a decision that has been made, not a
 * decision still waiting.
 */
export type AccessStatus = 'pending' | 'approved' | 'rejected'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  status: AccessStatus
  is_admin: boolean
  created_at: string
  decided_at: string | null
  decided_by: string | null
}

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
