<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <div class="container mx-auto px-4 py-8 max-w-6xl">
      <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 class="text-2xl md:text-3xl font-bold text-gray-800">Todo History</h1>
            <p class="text-sm md:text-base text-gray-600 mt-1">View and edit previous days</p>
          </div>
          <NuxtLink
            to="/"
            class="w-full md:w-auto text-center px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
          >
            ← Back to Home
          </NuxtLink>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div class="flex flex-col md:flex-row flex-wrap gap-4 items-stretch md:items-end">
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              v-model="filters.fromDate"
              type="date"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              v-model="filters.toDate"
              type="date"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div class="flex flex-col sm:flex-row gap-2 mt-2 md:mt-0">
             <button
              @click="loadHistory"
              class="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition text-center"
            >
              Load
            </button>
            <button
              @click="resetFilters"
              class="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition text-center"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="bg-white rounded-lg shadow-lg p-8 text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
        <p class="mt-4 text-gray-600">Loading history...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p class="text-red-800">{{ error }}</p>
      </div>

      <!-- History List -->
      <div v-else-if="Object.keys(groupedHistory).length > 0" class="space-y-4">
        <div
          v-for="(todos, date) in groupedHistory"
          :key="date"
          class="bg-white rounded-lg shadow-lg overflow-hidden"
        >
          <!-- Date Header -->
          <div class="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4">
            <div class="flex justify-between items-center">
              <div>
                <h2 class="text-xl font-bold text-white">
                  {{ formatDate(date) }}
                </h2>
                <p class="text-indigo-100 text-sm">
                  {{ getCompletionStats(todos) }}
                </p>
              </div>
              <div class="text-right">
                <div class="text-2xl font-bold text-white">
                  {{ getCompletionPercentage(todos) }}%
                </div>
                <div class="text-indigo-100 text-sm">Complete</div>
              </div>
            </div>
          </div>

          <!-- Todos List -->
          <div class="p-6 space-y-3">
            <div
              v-for="todo in todos"
              :key="todo.id"
              class="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition"
            >
              <label class="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  :checked="todo.is_completed"
                  @change="toggleHistoryTodo(todo, date)"
                  class="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                />
                <span
                  class="ml-3 text-base flex-1"
                  :class="todo.is_completed ? 'line-through text-gray-400' : 'text-gray-800 font-medium'"
                >
                  {{ todo.item_name }}
                </span>
                <span
                  v-if="todo.is_completed && todo.completed_at"
                  class="text-sm text-green-600"
                >
                  ✓ {{ formatTime(todo.completed_at) }}
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="bg-white rounded-lg shadow-lg p-12 text-center">
        <div class="text-6xl mb-4">📅</div>
        <h2 class="text-2xl font-semibold text-gray-700 mb-2">No History Found</h2>
        <p class="text-gray-600">Try adjusting your date range or start completing todos!</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DailyTodoWithItem } from '~/types'

const supabase = useSupabase()

const loading = ref(true)
const error = ref<string | null>(null)
const groupedHistory = ref<Record<string, DailyTodoWithItem[]>>({})

const filters = ref({
  fromDate: '',
  toDate: ''
})

// Set default date range (last 30 days)
const initializeDates = () => {
  const today = new Date()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(today.getDate() - 30)

  filters.value.toDate = today.toISOString().split('T')[0]
  filters.value.fromDate = thirtyDaysAgo.toISOString().split('T')[0]
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const todayStr = today.toISOString().split('T')[0]
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  if (dateStr === todayStr) {
    return 'Today - ' + date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    })
  } else if (dateStr === yesterdayStr) {
    return 'Yesterday - ' + date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getCompletionStats = (todos: DailyTodoWithItem[]) => {
  const completed = todos.filter(t => t.is_completed).length
  return `${completed} of ${todos.length} completed`
}

const getCompletionPercentage = (todos: DailyTodoWithItem[]) => {
  if (todos.length === 0) return 0
  const completed = todos.filter(t => t.is_completed).length
  return Math.round((completed / todos.length) * 100)
}

const loadHistory = async () => {
  try {
    loading.value = true
    error.value = null

    // Get current user
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      navigateTo('/login')
      return
    }

    // Load all todo items to get names
    const { data: items, error: itemsError } = await supabase
      .from('todo_items')
      .select('*')
      .eq('user_id', currentUser.id)

    if (itemsError) throw itemsError

    const itemMap = new Map(items?.map(item => [item.item_key, item.item_name]) || [])

    // Load daily todos
    let query = supabase
      .from('daily_todos')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('todo_date', { ascending: false })

    if (filters.value.fromDate) {
      query = query.gte('todo_date', filters.value.fromDate)
    }

    if (filters.value.toDate) {
      query = query.lte('todo_date', filters.value.toDate)
    }

    const { data: dailyTodos, error: dailyError } = await query

    if (dailyError) throw dailyError

    // Group by date and add item names
    const grouped: Record<string, DailyTodoWithItem[]> = {}

    dailyTodos?.forEach(todo => {
      if (!grouped[todo.todo_date]) {
        grouped[todo.todo_date] = []
      }

      grouped[todo.todo_date].push({
        ...todo,
        item_name: todo.item_name
      })
    })

    groupedHistory.value = grouped
  } catch (err: any) {
    error.value = err.message || 'Failed to load history'
    console.error('Error loading history:', err)
  } finally {
    loading.value = false
  }
}

const toggleHistoryTodo = async (todo: DailyTodoWithItem, date: string) => {
  try {
    const newCompletedState = !todo.is_completed

    const { error: updateError } = await supabase
      .from('daily_todos')
      .update({
        is_completed: newCompletedState,
        completed_at: newCompletedState ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', todo.id)

    if (updateError) throw updateError

    // Update local state
    const todos = groupedHistory.value[date]
    const index = todos.findIndex(t => t.id === todo.id)
    if (index !== -1) {
      todos[index].is_completed = newCompletedState
      todos[index].completed_at = newCompletedState ? new Date().toISOString() : null
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to update todo'
    console.error('Error toggling todo:', err)
  }
}

const resetFilters = () => {
  initializeDates()
  loadHistory()
}

onMounted(() => {
  initializeDates()
  loadHistory()
})
</script>