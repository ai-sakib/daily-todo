<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-4">
    <div class="container mx-auto px-4 max-w-7xl">
      <div class="bg-white rounded-lg shadow-lg p-4 mb-4">
        <div class="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          
          <div class="w-full xl:w-auto flex justify-between items-center">
            <div>
              <h1 class="text-2xl font-bold text-gray-800">Daily Todos</h1>
              <p class="text-sm text-gray-600">{{ formattedDate }}</p>
            </div>
            <div class="xl:hidden font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full text-sm">
              {{ Math.round((completedCount / (todos.length || 1)) * 100) }}%
            </div>
          </div>

          <div class="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full xl:w-auto">
            
            <div class="flex flex-row gap-3 overflow-x-auto pb-1 md:pb-0">
              <div v-if="user" class="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg flex-shrink-0">
                <img 
                  v-if="user.user_metadata?.avatar_url" 
                  :src="user.user_metadata.avatar_url" 
                  :alt="user.user_metadata?.name || 'User'"
                  class="w-8 h-8 rounded-full"
                />
                <div v-else class="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold">
                  {{ (user.user_metadata?.name || user.email || 'U').charAt(0).toUpperCase() }}
                </div>
                <span class="text-sm font-medium text-gray-700 block max-w-[200px] truncate">
                  {{ user.user_metadata?.name || user.email }}
                </span>
              </div>

              <div class="hidden sm:flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-lg flex-shrink-0">
                <span class="text-sm font-medium text-gray-700">Progress:</span>
                <span class="text-lg font-bold text-indigo-600">
                  {{ completedCount }}/{{ todos.length }}
                </span>
                <span class="text-sm text-indigo-600">({{ progressPercentage }}%)</span>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-2 w-full md:w-auto">
              <NuxtLink
                to="/history"
                class="flex items-center justify-center px-3 py-2 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 transition text-center"
              >
                History
              </NuxtLink>
              <NuxtLink
                to="/config"
                class="flex items-center justify-center px-3 py-2 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 transition text-center"
              >
                Config
              </NuxtLink>
              <button
                @click="handleSignOut"
                class="flex items-center justify-center px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition"
                title="Sign Out"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="bg-white rounded-lg shadow-lg p-8 text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
        <p class="mt-4 text-gray-600">Loading your todos...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-red-800">{{ error }}</p>
      </div>

      <!-- Todo Grid -->
      <div v-else-if="todos.length > 0">
        <!-- Grid Layout for Todos -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          <div
            v-for="todo in todos"
            :key="todo.id"
            class="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition cursor-pointer"
            @click="toggleTodo(todo)"
          >
            <div class="flex items-start gap-3">
              <input
                type="checkbox"
                :checked="todo.is_completed"
                @click.stop="toggleTodo(todo)"
                class="w-5 h-5 mt-0.5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer flex-shrink-0"
              />
              <div class="flex-1 min-w-0">
                <span
                  class="font-medium block"
                  :class="todo.is_completed ? 'line-through text-gray-400' : 'text-gray-800'"
                >
                  {{ todo.item_name }}
                </span>
                <span
                  v-if="todo.is_completed && todo.completed_at"
                  class="text-xs text-green-600 block mt-1"
                >
                  ✓ {{ formatTime(todo.completed_at) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="bg-white rounded-lg shadow-md p-4">
          <div class="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              class="bg-gradient-to-r from-indigo-500 to-purple-600 h-4 rounded-full transition-all duration-500 flex items-center justify-center"
              :style="{ width: `${progressPercentage}%` }"
            >
              <span v-if="progressPercentage > 10" class="text-xs font-bold text-white">
                {{ progressPercentage }}%
              </span>
            </div>
          </div>
          <div class="flex justify-between items-center mt-2">
            <span class="text-sm text-gray-600">
              {{ completedCount }} of {{ todos.length }} completed
            </span>
            <span v-if="completedCount === todos.length" class="text-sm font-semibold text-green-600">
              🎉 All done!
            </span>
            <span v-else class="text-sm text-gray-500">
              {{ todos.length - completedCount }} remaining
            </span>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="bg-white rounded-lg shadow-lg p-12 text-center">
        <div class="text-6xl mb-4">📝</div>
        <h2 class="text-2xl font-semibold text-gray-700 mb-2">No Todos Yet</h2>
        <p class="text-gray-600 mb-6">Get started by configuring your todo items</p>
        <NuxtLink
          to="/config"
          class="inline-block px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
        >
          Configure Todo Items
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DailyTodoWithItem } from '~/types'

const supabase = useSupabase()
const { user, signOut } = useAuth()

const todos = ref<DailyTodoWithItem[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const today = ref(new Date().toISOString().split('T')[0])

// Computed property to sort todos: uncompleted first, completed last
const sortedTodos = computed(() => {
  return [...todos.value].sort((a, b) => {
    // If one is completed and the other isn't, uncompleted comes first
    if (a.is_completed !== b.is_completed) {
      return a.is_completed ? 1 : -1
    }
    // If both have same completion status, maintain original order
    return 0
  })
})

const formattedDate = computed(() => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

const completedCount = computed(() => {
  return todos.value.filter(todo => todo.is_completed).length
})

const progressPercentage = computed(() => {
  if (todos.value.length === 0) return 0
  return Math.round((completedCount.value / todos.value.length) * 100)
})

const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const loadTodos = async () => {
  try {
    loading.value = true
    error.value = null

    // Get current user
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      navigateTo('/login')
      return
    }

    // Get active todo items for this user
    const { data: items, error: itemsError } = await supabase
      .from('todo_items')
      .select('*')
      .eq('is_active', true)
      .eq('user_id', currentUser.id)
      .order('display_order')

    if (itemsError) throw itemsError

    if (!items || items.length === 0) {
      todos.value = []
      loading.value = false
      return
    }

    // Get or create daily todos for today
    const { data: dailyTodos, error: dailyError } = await supabase
      .from('daily_todos')
      .select('*')
      .eq('todo_date', today.value)
      .eq('user_id', currentUser.id)

    if (dailyError) throw dailyError

    // Create a map of existing daily todos
    const dailyTodoMap = new Map(
      dailyTodos?.map(dt => [dt.item_key, dt]) || []
    )

    // Combine items with their daily status
    const combinedTodos: DailyTodoWithItem[] = []

    for (const item of items) {
      let dailyTodo = dailyTodoMap.get(item.item_key)

      // If no daily todo exists, create one
      if (!dailyTodo) {
        const { data: newDaily, error: createError } = await supabase
          .from('daily_todos')
          .insert({
            todo_date: today.value,
            item_key: item.item_key,
            item_name: item.item_name,
            is_completed: false,
            user_id: currentUser.id
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating daily todo:', createError)
          continue
        }

        dailyTodo = newDaily
      }

      combinedTodos.push({
        ...dailyTodo,
        item_name: item.item_name
      })
    }

    todos.value = combinedTodos
  } catch (err: any) {
    error.value = err.message || 'Failed to load todos'
    console.error('Error loading todos:', err)
  } finally {
    loading.value = false
  }
}

const handleSignOut = async () => {
  await signOut()
}

const toggleTodo = async (todo: DailyTodoWithItem) => {
  try {
    const newCompletedState = !todo.is_completed

    // Optimistically update local state immediately
    const index = todos.value.findIndex(t => t.id === todo.id)
    if (index !== -1) {
      todos.value[index].is_completed = newCompletedState
      todos.value[index].completed_at = newCompletedState ? new Date().toISOString() : null
    }

    // Update database in background
    const { error: updateError } = await supabase
      .from('daily_todos')
      .update({
        is_completed: newCompletedState,
        completed_at: newCompletedState ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', todo.id)

    if (updateError) {
      // Revert on error
      if (index !== -1) {
        todos.value[index].is_completed = !newCompletedState
        todos.value[index].completed_at = todo.completed_at
      }
      throw updateError
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to update todo'
    console.error('Error toggling todo:', err)
  }
}

onMounted(async () => {
  await user.value || await useAuth().fetchUser()
  await loadTodos()
})
</script>