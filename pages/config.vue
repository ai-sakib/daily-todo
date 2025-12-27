<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <div class="container mx-auto px-4 py-8 max-w-6xl">
      
      <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 class="text-2xl md:text-3xl font-bold text-gray-800">Configure Items</h1>
            <p class="text-sm md:text-base text-gray-600 mt-1">Manage your general routine or specific days</p>
          </div>
          <NuxtLink
            to="/"
            class="w-full md:w-auto text-center px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
          >
            ← Back to Home
          </NuxtLink>
        </div>

        <div class="flex space-x-4 mt-6 border-b border-gray-200">
          <button
            @click="activeTab = 'general'"
            class="pb-3 px-2 text-sm font-medium transition-colors relative"
            :class="activeTab === 'general' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'"
          >
            General Configuration
          </button>
          <button
            @click="activeTab = 'custom'"
            class="pb-3 px-2 text-sm font-medium transition-colors relative"
            :class="activeTab === 'custom' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'"
          >
            Date Specific
          </button>
        </div>
      </div>

      <Transition name="fade">
        <div v-if="message" 
          class="fixed top-5 right-5 z-[100] max-w-sm w-full shadow-2xl rounded-lg border p-4 flex items-start gap-3 animate-in slide-in-from-right-5 duration-300"
          :class="message.type === 'error' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-green-50 text-green-800 border-green-200'"
        >
          <div class="flex-1">
            <p class="text-sm font-medium">{{ message.text }}</p>
          </div>
          <button @click="message = null" class="text-gray-400 hover:text-gray-600 transition">
            <span class="text-xl leading-none">×</span>
          </button>
        </div>
      </Transition>

      <div v-if="activeTab === 'general'">
        <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">Add General Todo Item</h2>
          <form @submit.prevent="addItem" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Item Name
              </label>
              <input
                v-model="newItem.name"
                type="text"
                required
                placeholder="e.g., Reading Book"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {{ isSubmitting ? 'Adding...' : '+ Add General Item' }}
            </button>
          </form>
        </div>

        <div v-if="loading" class="bg-white rounded-lg shadow-lg p-8 text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p class="mt-4 text-gray-600">Loading items...</p>
        </div>

        <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="bg-white rounded-lg shadow-lg p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-semibold text-gray-800">
                Active Items
                <span class="ml-2 text-sm font-normal text-gray-500">({{ activeItems.length }})</span>
              </h2>
              <div class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                Shown on home
              </div>
            </div>

            <div
              ref="activeDropZone"
              class="min-h-[300px] rounded-lg transition-colors"
            >
              <div v-if="activeItems.length === 0" class="flex items-center justify-center h-[200px] text-gray-500">
                <div class="text-center">
                  <div class="text-4xl mb-2">📋</div>
                  <p>No active items</p>
                </div>
              </div>

              <div v-else class="space-y-2">
                <div
                  v-for="item in activeItems"
                  :key="item.id"
                  class="relative border rounded-lg px-2 py-1.5 transition-all duration-200"
                  :class="{
                    'border-gray-200 hover:border-indigo-300 hover:shadow-md bg-white cursor-grab active:cursor-grabbing': editingId !== item.id,
                    'cursor-default border-gray-300': editingId === item.id
                  }"
                >
                  <div v-if="editingId === item.id" class="space-y-3">
                    <input
                      v-model="editForm.name"
                      type="text"
                      class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                      placeholder="Item Name"
                    />
                    <div class="flex gap-2">
                      <button
                        @click="saveEdit(item.id)"
                        class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
                      >
                        Save
                      </button>
                      <button
                        @click="cancelEdit"
                        class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>

                  <div v-else class="px-2 py-1 flex items-center gap-2">
                    <div class="flex-1 min-w-0">
                      <h3 @click="startEdit(item)" class="font-semibold text-gray-800 truncate cursor-pointer hover:text-indigo-600">{{ item.item_name }}</h3>
                    </div>

                    <div class="flex items-center gap-2 flex-shrink-0">
                      <button
                        @click="toggleActive(item)"
                        class="w-7 h-7 px-2 py-1 text-gray-700 rounded-full hover:bg-gray-200 transition text-sm"
                        title="Move to Inactive"
                      >
                        →
                      </button>
                      
                      <button
                        @click="deleteItem(item)"
                        class="w-7 h-7 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full transition" title="Delete">✕</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-lg p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-semibold text-gray-800">
                Inactive Items
                <span class="ml-2 text-sm font-normal text-gray-500">({{ inactiveItems.length }})</span>
              </h2>
              <div class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                Hidden from home
              </div>
            </div>
            <p class="text-sm text-gray-600 mb-4">
              Items here won't appear in your daily todos
            </p>

            <div
              ref="inactiveDropZone"
              class="min-h-[300px] rounded-lg transition-colors"
            >
              <div v-if="inactiveItems.length === 0" class="flex items-center justify-center h-[200px] text-gray-500">
                <div class="text-center">
                  <div class="text-4xl mb-2">💤</div>
                  <p>No inactive items</p>
                </div>
              </div>

              <div v-else class="space-y-2">
                <div
                  v-for="item in inactiveItems"
                  :key="item.id"
                  class="relative border rounded-lg px-2 py-1.5 transition-all duration-200 opacity-75 hover:opacity-100"
                  :class="{
                    'border-gray-200 hover:border-gray-400 hover:shadow-md bg-white cursor-grab active:cursor-grabbing': editingId !== item.id,
                    'cursor-default border-gray-300': editingId === item.id
                  }"
                >
                  <div v-if="editingId === item.id" class="space-y-3">
                    <input
                      v-model="editForm.name"
                      type="text"
                      class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                      placeholder="Item Name"
                    />
                    <div class="flex gap-2">
                      <button @click="saveEdit(item.id)" class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition">Save</button>
                      <button @click="cancelEdit" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition">Cancel</button>
                    </div>
                  </div>

                  <div v-else class="px-2 py-1 flex items-center gap-2">
                    <div class="flex-1 min-w-0">
                      <h3 @click="startEdit(item)" class="font-semibold text-gray-600 truncate cursor-pointer">{{ item.item_name }}</h3>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                      <button @click="toggleActive(item)" class="w-7 h-7 text-green-700 rounded-full hover:bg-green-200 transition text-sm" title="Move to Active">←</button>
                      <button @click="deleteItem(item)" class="w-7 h-7 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full transition" title="Delete">✕</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else>
        <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
           <div class="flex flex-col sm:flex-row gap-4 items-end mb-6">
            <div class="flex-1 w-full">
              <label class="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
              <div class="flex items-center gap-2">
                <button 
                  @click="shiftDate(-1)"
                  :disabled="isPrevDisabled"
                  class="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Previous Day"
                >
                  <span class="text-xl">‹</span>
                </button>

                <input 
                  v-model="selectedDate" 
                  type="date" 
                  :min="todayStr"
                  @change="loadDateTodos"
                  class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />

                <button 
                  @click="shiftDate(1)"
                  class="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition"
                  title="Next Day"
                >
                  <span class="text-xl">›</span>
                </button>
              </div>
            </div>
            
            <button
              v-if="selectedDate"
              @click="syncGeneralItems"
              :disabled="isSyncing"
              class="w-full sm:w-auto px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition flex items-center gap-2 whitespace-nowrap"
            >
              <span>↻</span>
              Sync General Items
            </button>
          </div>
           
           <div class="text-sm text-gray-500 mb-6 bg-blue-50 p-3 rounded-lg border border-blue-100">
               <p><strong>How it works:</strong> Changes here only affect this specific date.</p>
               <ul class="list-disc ml-4 mt-1 space-y-1">
                   <li>If this is your first time visiting this date, we automatically copied your General items.</li>
                   <li>You can delete items here without affecting the main list.</li>
                   <li>Click "Sync General Items" to fetch any new items you added to the General list later.</li>
               </ul>
           </div>

          <div class="border-t border-gray-100 pt-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-3">
              Add Item for <span class="block sm:inline text-indigo-600 sm:text-gray-800">{{ formattedSelectedDate }}</span>
            </h3>
            
            <form @submit.prevent="addDateSpecificItem" class="flex flex-col sm:flex-row gap-3">
              <div class="flex-1">
                <input
                  v-model="newDateItem.name"
                  type="text"
                  required
                  placeholder="e.g., Special Doctor Appointment"
                  class="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-base"
                />
              </div>
              
              <button
                type="submit"
                :disabled="isSubmitting"
                class="w-full sm:w-auto px-6 py-3 sm:py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition disabled:bg-gray-400 font-medium whitespace-nowrap shadow-sm active:transform active:scale-95"
              >
                <span v-if="isSubmitting">Adding...</span>
                <span v-else>+ Add to Date</span>
              </button>
            </form>
          </div>
        </div>

        <div v-if="loadingDateItems" class="bg-white rounded-lg shadow-lg p-8 text-center">
           <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
           <p class="mt-4 text-gray-600">Loading schedule for {{ formattedSelectedDate }}...</p>
        </div>

        <div v-else class="bg-white rounded-lg shadow-lg p-6">
           <h2 class="text-xl font-semibold text-gray-800 mb-4">Todo List for {{ formattedSelectedDate }}</h2>
           
           <div v-if="dateSpecificTodos.length === 0" class="text-center py-10 text-gray-500">
              <div class="text-4xl mb-2">📅</div>
              <p>No items scheduled for this date.</p>
              <button @click="syncGeneralItems" class="text-indigo-600 hover:underline mt-2 text-sm">Sync from General List</button>
           </div>

           <div v-else class="space-y-3">
              <div 
                v-for="item in dateSpecificTodos" 
                :key="item.id"
                class="flex items-center justify-between px-3 py-2 border rounded-lg hover:shadow-sm transition-shadow bg-white border-gray-200"
              > 
                <div v-if="editingDateItemId === item.id" class="flex-1 flex gap-2 mr-2">
                   <input
                      v-model="editDateForm.name"
                      type="text"
                      class="flex-1 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                   />
                   <button @click="saveDateItemEdit(item)" class="px-3 py-1 bg-green-500 text-white rounded text-sm">Save</button>
                   <button @click="cancelDateItemEdit" class="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm">Cancel</button>
                </div>

                <div v-else class="flex items-center gap-3 flex-1 min-w-0">
                   <span @click="startDateItemEdit(item)" class="hover:cursor-pointer font-medium text-gray-800 truncate">{{ item.item_name }}</span>
                </div>

                <div v-if="editingDateItemId !== item.id" class="flex items-center gap-2">
                   <button 
                      @click="deleteDateItem(item)"
                      class="w-7 h-7 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full transition"
                      title="Remove from this date"
                   >
                      ✕
                   </button>
                </div>
              </div>
           </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import type { TodoItem } from '~/types'

interface DailyTodo {
  id: string
  user_id: string
  todo_date: string
  item_name: string
  is_completed: boolean
  item_key: string
}

const supabase = useSupabase()

// TABS STATE
const activeTab = ref<'general' | 'custom'>('general')

// GENERAL CONFIG STATE
const items = ref<TodoItem[]>([])
const loading = ref(true)
const isSubmitting = ref(false)
const editingId = ref<string | null>(null)
const newItem = ref({ name: '' })
const editForm = ref({ name: '' })
const message = ref<{ type: 'success' | 'error', text: string } | null>(null)

// DATE SPECIFIC STATE
const selectedDate = ref('')
const dateSpecificTodos = ref<DailyTodo[]>([])
const loadingDateItems = ref(false)
const isSyncing = ref(false)
const newDateItem = ref({ name: '' })
const editingDateItemId = ref<string | null>(null)
const editDateForm = ref({ name: '' })

// COMPUTED
const today = computed(() => {
  const d = new Date()
  d.setDate(d.getDate())
  return d.toISOString().split('T')[0]
})

const formattedSelectedDate = computed(() => {
  if (!selectedDate.value) return ''
  return new Date(selectedDate.value).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  })
})

const activeItems = computed(() => 
  items.value.filter(item => item.is_active).sort((a, b) => a.display_order - b.display_order)
)

const inactiveItems = computed(() => 
  items.value.filter(item => !item.is_active).sort((a, b) => a.display_order - b.display_order)
)

// ================= HELPER FUNCTIONS =================

const generateKey = (name: string): string => {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50) + '_' + Date.now()
}

// ================= GENERAL CONFIG LOGIC =================
const loadItems = async () => {
  try {
    loading.value = true
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return navigateTo('/login')
    
    const { data, error } = await supabase
      .from('todo_items')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at')

    if (error) throw error
    items.value = data || []
  } catch (err: any) {
    showMessage('error', err.message || 'Failed to load items')
  } finally {
    loading.value = false
  }
}

const addItem = async () => {
  try {
    isSubmitting.value = true
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) { showMessage('error', 'You must be logged in'); return; }

    const activeItemsCount = activeItems.value.length
    const maxOrder = activeItemsCount > 0 ? Math.max(...activeItems.value.map(i => i.display_order)) : 0

    const { error } = await supabase.from('todo_items').insert({
        item_key: generateKey(newItem.value.name),
        item_name: newItem.value.name,
        is_active: true,
        display_order: maxOrder + 1,
        user_id: currentUser.id
      })

    if (error) throw error
    showMessage('success', 'Item added successfully!')
    newItem.value = { name: '' }
    await loadItems()
  } catch (err: any) {
    showMessage('error', err.message || 'Failed to add item')
  } finally {
    isSubmitting.value = false
  }
}

const toggleActive = async (item: TodoItem) => {
  const newActiveState = !item.is_active; const targetList = newActiveState ? activeItems.value : inactiveItems.value; const newOrder = targetList.length + 1
  const itemIndex = items.value.findIndex(i => i.id === item.id); if (itemIndex !== -1) { items.value[itemIndex].is_active = newActiveState; items.value[itemIndex].display_order = newOrder }
  const { error } = await supabase.from('todo_items').update({ is_active: newActiveState, display_order: newOrder }).eq('id', item.id)
  if (error) { showMessage('error', 'Failed to save changes'); loadItems() }
}
const startEdit = (item: TodoItem) => { editingId.value = item.id; editForm.value = { name: item.item_name } }
const cancelEdit = () => { editingId.value = null; editForm.value = { name: '' } }
const saveEdit = async (itemId: string) => {
  try { const { error } = await supabase.from('todo_items').update({ item_name: editForm.value.name }).eq('id', itemId); if (error) throw error; showMessage('success', 'Item updated!'); editingId.value = null; await loadItems() } catch (err: any) { showMessage('error', err.message || 'Failed to update') }
}
const deleteItem = async (item: TodoItem) => {
  if (!confirm(`Are you sure you want to delete "${item.item_name}"?`)) return
  try { const { error } = await supabase.from('todo_items').delete().eq('id', item.id); if (error) throw error; showMessage('success', 'Item deleted!'); await loadItems() } catch (err: any) { showMessage('error', err.message || 'Failed to delete') }
}

// ================= DATE SPECIFIC LOGIC =================

const syncGeneralItems = async () => {
  if (!selectedDate.value) return
  loadingDateItems.value = true
  isSyncing.value = true

  try {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return

    // 1. Get all active general items
    const { data: generalItems } = await supabase
      .from('todo_items')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('is_active', true)
      
    if (!generalItems || generalItems.length === 0) return

    // 2. Get existing items for this specific date
    const { data: existingItems } = await supabase
      .from('daily_todos')
      .select('item_key')
      .eq('user_id', currentUser.id)
      .eq('todo_date', selectedDate.value)
      
    const existingKeys = new Set(existingItems?.map(i => i.item_key) || [])
    
    // 3. Filter only items that DON'T exist yet for this date
    const itemsToAdd = generalItems
      .filter(g => !existingKeys.has(g.item_key))
      .map(g => ({
        user_id: currentUser.id,
        todo_date: selectedDate.value,
        item_name: g.item_name,
        item_key: g.item_key,
        is_completed: false
      }))

    if (itemsToAdd.length > 0) {
      const { error } = await supabase.from('daily_todos').insert(itemsToAdd)
      if (error) throw error
    }

    // 4. Mark as initialized
    await supabase.from('daily_schedule_status').upsert({
      user_id: currentUser.id,
      schedule_date: selectedDate.value,
      is_initialized: true
    }, { onConflict: 'user_id, schedule_date' })

    await loadDateTodosOnly()
    showMessage('success', 'Synced with general list')

  } catch (err: any) {
    showMessage('error', 'Sync failed')
    console.error(err)
  } finally {
    isSyncing.value = false
    loadingDateItems.value = false
  }
}

const loadDateTodosOnly = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return
    const { data, error } = await supabase
      .from('daily_todos')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('todo_date', selectedDate.value)
      .order('created_at')
    if (error) throw error
    dateSpecificTodos.value = data || []
}

const loadDateTodos = async () => {
  if (!selectedDate.value) return
  
  try {
     loadingDateItems.value = true
     const { data: { user: currentUser } } = await supabase.auth.getUser()
     if (!currentUser) return

     // Check if this date is initialized
     const { data: statusData } = await supabase
        .from('daily_schedule_status')
        .select('is_initialized')
        .eq('user_id', currentUser.id)
        .eq('schedule_date', selectedDate.value)
        .maybeSingle()
    
     const isInitialized = statusData?.is_initialized

     if (!isInitialized) {
        // First time visiting this date! Run sync automatically
        await syncGeneralItems()
     } else {
        // Already initialized, just load what is there
        await loadDateTodosOnly()
     }

  } catch (err: any) {
     showMessage('error', 'Failed to load date schedule')
     console.error(err)
  } finally {
     loadingDateItems.value = false
  }
}

const addDateSpecificItem = async () => {
   if (!selectedDate.value) return showMessage('error', 'Please select a date first')
   
   try {
      isSubmitting.value = true
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) return
      
      const { error } = await supabase.from('daily_todos').insert({
         user_id: currentUser.id,
         todo_date: selectedDate.value,
         item_name: newDateItem.value.name,
         item_key: generateKey(newDateItem.value.name),
         is_completed: false
      })
      
      if (error) throw error
      
      // Ensure we mark as initialized if we manually add an item
      await supabase.from('daily_schedule_status').upsert({
         user_id: currentUser.id,
         schedule_date: selectedDate.value,
         is_initialized: true
      }, { onConflict: 'user_id, schedule_date' })
      
      showMessage('success', 'Added to schedule')
      newDateItem.value.name = ''
      await loadDateTodosOnly()
   } catch (err: any) {
      showMessage('error', err.message || 'Failed to add item')
   } finally {
      isSubmitting.value = false
   }
}

const startDateItemEdit = (item: DailyTodo) => {
   editingDateItemId.value = item.id
   editDateForm.value.name = item.item_name
}

const cancelDateItemEdit = () => {
   editingDateItemId.value = null
   editDateForm.value.name = ''
}

const saveDateItemEdit = async (item: DailyTodo) => {
   try {
      const { error } = await supabase
        .from('daily_todos')
        .update({ item_name: editDateForm.value.name })
        .eq('id', item.id)
      
      if (error) throw error
      showMessage('success', 'Item updated for this date')
      editingDateItemId.value = null
      await loadDateTodosOnly()
   } catch (err: any) {
      showMessage('error', err.message || 'Failed to update')
   }
}

const deleteDateItem = async (item: DailyTodo) => {
   if (!confirm(`Remove "${item.item_name}" from ${formattedSelectedDate.value}?`)) return
   
   try {
     const { error } = await supabase.from('daily_todos').delete().eq('id', item.id)
     if (error) throw error
     
     // Note: We do NOT toggle is_initialized back to false. 
     // The user intentionally deleted it, so we don't want auto-sync to bring it back.
     
     await loadDateTodosOnly()
     showMessage('success', 'Removed from date')
   } catch (err: any) {
      showMessage('error', err.message)
   }
}

// Helper for date string formatting (YYYY-MM-DD)
const todayStr = computed(() => new Date().toISOString().split('T')[0])

// Disable prev if selectedDate is today or earlier
const isPrevDisabled = computed(() => {
  if (!selectedDate.value) return true
  return selectedDate.value <= todayStr.value
})

// Function to move date forward or backward
const shiftDate = (days: number) => {
  if (!selectedDate.value) return
  
  const current = new Date(selectedDate.value)
  current.setDate(current.getDate() + days)
  
  const newDateStr = current.toISOString().split('T')[0]
  
  // Prevent going before today
  if (newDateStr < todayStr.value) return
  
  selectedDate.value = newDateStr
  loadDateTodos() // Trigger the load/sync logic
}

let messageTimeout: NodeJS.Timeout | null = null

const showMessage = (type: 'success' | 'error', text: string) => {
  // Clear any existing timer
  if (messageTimeout) clearTimeout(messageTimeout)
  
  message.value = { type, text }
  
  // Set auto-hide timer for 4 seconds
  messageTimeout = setTimeout(() => {
    message.value = null
  }, 4000)
}

watch(activeTab, (newTab) => {
  if (newTab === 'custom') {
    // Only load if we have a date selected, otherwise default to tomorrow logic inside the function or here
    if (!selectedDate.value) {
       selectedDate.value = todayStr.value
    }

    loadDateTodos()
  }
})

onMounted(() => {
   loadItems()
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
