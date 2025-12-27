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
                Add Todo
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
              <Transition name="celebrate">
                <div v-if="showCelebration" 
                    class="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none overflow-hidden">
                  
                  <div class="absolute inset-0 bg-indigo-500/10 backdrop-blur-[2px] animate-pulse pointer-events-auto" @click="showCelebration = false"></div>

                  <div class="relative bg-white/90 backdrop-blur-md p-10 rounded-[2rem] shadow-[0_20px_50px_rgba(99,102,241,0.3)] border border-white flex flex-col items-center transform transition-all duration-700 pointer-events-auto">
                    
                    <!-- <button 
                      @click="showCelebration = false"
                      class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-2"
                    >
                      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button> -->

                    <div class="text-6xl mb-4 animate-bounce">🏆</div>
                    
                    <h2 class="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 pb-2 tracking-tight">
                      COMPLETED!
                    </h2>
                    
                    <div class="h-1 w-24 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full mb-4"></div>
                    
                    <p class="text-gray-600 font-medium text-lg text-center w-full max-w-[280px] sm:max-w-md mx-auto break-words px-2">
                      {{ currentPhrase }}
                    </p>
                    
                    <div class="absolute -top-4 -right-4 w-12 h-12 bg-yellow-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
                    <div class="absolute -bottom-4 -left-4 w-12 h-12 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
                  </div>
                </div>
              </Transition>
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
          Add Todo Items
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import confetti from 'canvas-confetti'
import type { DailyTodoWithItem } from '~/types'

const supabase = useSupabase()
const { user, signOut } = useAuth()

const todos = ref<DailyTodoWithItem[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const today = ref(new Date().toLocaleDateString('en-CA'))
const showCelebration = ref(false)
const celebrationPhrases = [
  "🏆 TASKS: ABSOLUTELY CRUSHED",
  "🎊 THE DEED IS DONE (LEGENDARY)",
  "🚀 ENERGY: DEPLETED",
  "🔥 CALL THE FIRE DEPARTMENT, YOU'RE ON FIRE!",
  "💎 PURE PRODUCTIVITY POISON",
  "🌈 THE TO-DO LIST IS CRYING NOW",
  "👑 ABSOLUTE KING/QUEEN OF DONE",
  "🎯 BULLSEYE! NO PRISONERS TAKEN",
  "🦾 PRODUCTIVITY LEVEL: CYBORG",
  "🛸 BEAM ME UP, TASKS ARE FINISHED",
  "🕺 VIBE: UNSTOPPABLE",
  "⚡ 1.21 GIGAWATTS OF PURE EXECUTION",
  "🥂 THE TO-DO LIST HAS LEFT THE CHAT",
  "🌟 BRIGHTER THAN A SUPERNOVA",
  "🛑 STOP! YOU’RE TOO POWERFUL",
  "🍄 POWER-UP ACQUIRED: DAY COMPLETE",
  "🍕 TO-DO LIST: EATEN FOR BREAKFAST",
  "🧘 ZEN LEVEL: MAXIMUM (TASKS ZERO)",
  "🧠 BRAIN STATUS: 100% RELAX MODE",
  "🎬 THAT’S A WRAP! NO RE-TAKES",
  "🌋 BOOM! TASK-CANO ERUPTION",
  "🏄‍♂️ RIDING THE WAVE OF SUCCESS",
  "🏴‍☠️ BOUNTY COLLECTED: ALL DONE",
  "🦄 LEGENDARY STREAK: UNLOCKED",
  "🧨 TASKS? GONE. REDUCED TO ATOMS",
  "⚔️ BOSS BATTLE: WON (TASKS DEFEATED)"
]

const currentPhrase = ref("")

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
  if (!timestamp) return ''
  // toLocaleTimeString automatically converts UTC from DB to BDT (GMT+6)
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
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

    // Get or create daily todos for today
    const { data: dailyTodos, error: dailyError } = await supabase
      .from('daily_todos')
      .select('*')
      .eq('todo_date', today.value)
      .eq('user_id', currentUser.id)

    if (dailyError) throw dailyError

    if (dailyTodos.length > 0) {
      todos.value = dailyTodos
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

    if (newCompletedState && todos.value.every(t => t.is_completed)) {
      triggerCelebration()
    }

    // Update database in background

    const now = new Date().toISOString()

    const { error: updateError } = await supabase
      .from('daily_todos')
      .update({
        is_completed: newCompletedState,
        completed_at: newCompletedState ? now : null,
        updated_at: now
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

const triggerCelebration = () => {
  const randomIndex = Math.floor(Math.random() * celebrationPhrases.length)
  currentPhrase.value = celebrationPhrases[randomIndex]
  
  showCelebration.value = true
  
  // Confetti Logic
  const end = Date.now() + 3 * 1000;
  const colors = ['#6366f1', '#a855f7', '#ec4899'];

  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors: colors
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors: colors
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  }());
}

onMounted(async () => {
  await user.value || await useAuth().fetchUser()
  await loadTodos()

  if (todos.value.length > 0 && todos.value.every(t => t.is_completed)) {
    triggerCelebration()
  }
})
</script>

<style scoped>
/* Celebration Transitions */
.celebrate-enter-active {
  transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.celebrate-leave-active {
  transition: all 0.5s ease-in;
}
.celebrate-enter-from {
  opacity: 0;
  transform: scale(0.5) translateY(100px);
}
.celebrate-leave-to {
  opacity: 0;
  transform: scale(1.2);
}
.animate-blob {
  animation: blob 7s infinite;
}
.animation-delay-2000 {
  animation-delay: 2s;
}
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
.text-lg {
  animation: spring-up 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* Blob Animation for the background glow */
@keyframes blob {
  0% { transform: translate(0px, 0px) scale(1); }
  33% { transform: translate(30px, -50px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
  100% { transform: translate(0px, 0px) scale(1); }
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: .8; transform: scale(1.05); }
}
@keyframes spring-up {
  0% { transform: scale(0.5); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
</style>