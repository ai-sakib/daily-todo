export interface TodoItem {
  id: string
  item_key: string
  item_name: string
  is_active: boolean
  display_order: number
  created_at: string
}

export interface DailyTodo {
  id: string
  todo_date: string
  item_key: string
  is_completed: boolean
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface DailyTodoWithItem extends DailyTodo {
  item_name: string
}