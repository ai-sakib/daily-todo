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

      <div v-if="message" class="mb-6 p-4 rounded-lg" :class="message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'">
        {{ message.text }}
      </div>

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
            <p class="text-sm text-gray-600 mb-4">
              Drag to reorder • Top item has highest priority
            </p>

            <div
              ref="activeDropZone"
              class="min-h-[300px] rounded-lg transition-colors"
              :class="{
                'bg-indigo-50 border-2 border-dashed border-indigo-400': isDraggingOverActive && !draggedFromActive,
                'bg-white': !(isDraggingOverActive && !draggedFromActive)
              }"
              @dragover.prevent="handleDragOverSection($event, true)"
              @dragleave="handleDragLeaveSection"
              @drop.prevent="handleDropToSection($event, true)"
            >
              <div v-if="activeItems.length === 0" class="flex items-center justify-center h-[200px] text-gray-500">
                <div class="text-center">
                  <div class="text-4xl mb-2">📋</div>
                  <p>No active items</p>
                  <p class="text-sm">Drag items here or add new ones above</p>
                </div>
              </div>

              <div v-else class="space-y-2">
                <div
                  v-for="(item, index) in activeItems"
                  :key="item.id"
                  :draggable="editingId !== item.id"
                  @dragstart="handleDragStart($event, item, index, true)"
                  @dragend="handleDragEnd"
                  @dragover.prevent="handleDragOverItem($event, item, index, true)"
                  @drop.prevent="handleDropOnItem($event, item, index, true)"
                  class="relative border-2 rounded-lg p-2 transition-all duration-200"
                  :class="{
                    'opacity-40 scale-95': draggedItem?.id === item.id,
                    'border-gray-200 hover:border-indigo-300 hover:shadow-md bg-white cursor-grab active:cursor-grabbing': draggedItem?.id !== item.id && editingId !== item.id,
                    'border-indigo-400 bg-indigo-50 transform translate-y-1': dropTargetIndex === index && dropTargetSection === 'active' && draggedItem?.id !== item.id,
                    'cursor-default border-gray-300': editingId === item.id
                  }"
                >
                  <div 
                    v-if="dropTargetIndex === index && dropTargetSection === 'active' && draggedItem?.id !== item.id"
                    class="absolute -top-1 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"
                  ></div>

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

                  <div v-else class="flex items-center gap-2">
                    <div class="flex-shrink-0 w-7 h-7 bg-indigo-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {{ index + 1 }}
                    </div>

                    <div class="flex-1 min-w-0">
                      <h3 @click="startEdit(item)" class="font-semibold text-gray-800 truncate cursor-pointer hover:text-indigo-600">{{ item.item_name }}</h3>
                    </div>

                    <div class="flex items-center gap-2 flex-shrink-0">
                      <button
                        @click="toggleActive(item)"
                        class="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-sm"
                        title="Move to Inactive"
                      >
                        →
                      </button>
                      
                      <button
                        @click="deleteItem(item)"
                        class="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>

                <div
                  v-if="dropTargetIndex === activeItems.length && dropTargetSection === 'active'"
                  class="h-12 border-2 border-dashed border-indigo-400 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 text-sm"
                >
                  Drop here
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
              :class="{
                'bg-gray-100 border-2 border-dashed border-gray-400': isDraggingOverInactive && draggedFromActive,
                'bg-white': !(isDraggingOverInactive && draggedFromActive)
              }"
              @dragover.prevent="handleDragOverSection($event, false)"
              @dragleave="handleDragLeaveSection"
              @drop.prevent="handleDropToSection($event, false)"
            >
              <div v-if="inactiveItems.length === 0" class="flex items-center justify-center h-[200px] text-gray-500">
                <div class="text-center">
                  <div class="text-4xl mb-2">💤</div>
                  <p>No inactive items</p>
                  <p class="text-sm">Drag items here to hide them</p>
                </div>
              </div>

              <div v-else class="space-y-2">
                <div
                  v-for="(item, index) in inactiveItems"
                  :key="item.id"
                  :draggable="editingId !== item.id"
                  @dragstart="handleDragStart($event, item, index, false)"
                  @dragend="handleDragEnd"
                  @dragover.prevent="handleDragOverItem($event, item, index, false)"
                  @drop.prevent="handleDropOnItem($event, item, index, false)"
                  class="relative border-2 rounded-lg p-2 transition-all duration-200 opacity-75 hover:opacity-100"
                  :class="{
                    'opacity-20 scale-95': draggedItem?.id === item.id,
                    'border-gray-200 hover:border-gray-400 hover:shadow-md bg-white cursor-grab active:cursor-grabbing': draggedItem?.id !== item.id && editingId !== item.id,
                    'border-gray-400 bg-gray-100 transform translate-y-1': dropTargetIndex === index && dropTargetSection === 'inactive' && draggedItem?.id !== item.id,
                    'cursor-default border-gray-300': editingId === item.id
                  }"
                >
                  <div 
                    v-if="dropTargetIndex === index && dropTargetSection === 'inactive' && draggedItem?.id !== item.id"
                    class="absolute -top-1 left-0 right-0 h-0.5 bg-gray-500 rounded-full"
                  ></div>

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

                  <div v-else class="flex items-center gap-2">
                    <div class="flex-shrink-0 w-7 h-7 bg-indigo-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {{ index + 1 }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <h3 @click="startEdit(item)" class="font-semibold text-gray-600 truncate cursor-pointer">{{ item.item_name }}</h3>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                      <button @click="toggleActive(item)" class="px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition text-sm" title="Move to Active">←</button>
                      <button @click="deleteItem(item)" class="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm" title="Delete">🗑️</button>
                    </div>
                  </div>
                </div>

                <div
                  v-if="dropTargetIndex === inactiveItems.length && dropTargetSection === 'inactive'"
                  class="h-12 border-2 border-dashed border-gray-400 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 text-sm"
                >
                  Drop here
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
              <input 
                v-model="selectedDate" 
                type="date" 
                :min="today"
                @change="loadDateTodos"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <button
               v-if="selectedDate"
               @click="syncGeneralItems"
               :disabled="isSyncing"
               class="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition flex items-center gap-2 whitespace-nowrap"
            >
               <span v-if="isSyncing" class="animate-spin">↻</span>
               <span v-else>↻</span>
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
              <h3 class="text-lg font-semibold text-gray-800 mb-3">Add Item for {{ formattedSelectedDate }}</h3>
              <form @submit.prevent="addDateSpecificItem" class="flex gap-3">
                <input
                  v-model="newDateItem.name"
                  type="text"
                  required
                  placeholder="e.g., Special Doctor Appointment"
                  class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  :disabled="isSubmitting"
                  class="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition disabled:bg-gray-400 font-medium whitespace-nowrap"
                >
                  {{ isSubmitting ? 'Adding...' : '+ Add to Date' }}
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
                class="flex items-center justify-between p-3 border rounded-lg hover:shadow-sm transition-shadow bg-white border-gray-200"
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
                   <span class="font-medium text-gray-800 truncate">{{ item.item_name }}</span>
                </div>

                <div v-if="editingDateItemId !== item.id" class="flex items-center gap-2">
                   <button 
                      @click="startDateItemEdit(item)"
                      class="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition"
                      title="Edit for this date"
                   >
                      ✎
                   </button>
                   <button 
                      @click="deleteDateItem(item)"
                      class="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition"
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
const { user } = useSupabaseUser()

// TABS STATE
const activeTab = ref<'general' | 'custom'>('general')

// GENERAL CONFIG STATE
const items = ref<TodoItem[]>([])
const loading = ref(true)
const isSubmitting = ref(false)
const editingId = ref<string | null>(null)
const draggedItem = ref<TodoItem | null>(null)
const draggedFromActive = ref<boolean>(false)
const dropTargetIndex = ref<number | null>(null)
const dropTargetSection = ref<'active' | 'inactive' | null>(null)
const isDraggingOverActive = ref(false)
const isDraggingOverInactive = ref(false)
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

const showMessage = (type: 'success' | 'error', text: string) => {
  message.value = { type, text }
  setTimeout(() => { message.value = null }, 3000)
}

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
      .order('display_order')

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

// ... Drag & Drop Logic (Same as before) ...
const handleDragStart = (event: DragEvent, item: TodoItem, index: number, isActive: boolean) => {
  draggedItem.value = item; draggedFromActive.value = isActive
  if (event.dataTransfer) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', item.id) }
}
const handleDragOverSection = (event: DragEvent, isActive: boolean) => {
  event.preventDefault(); isActive ? (isDraggingOverActive.value = true, isDraggingOverInactive.value = false) : (isDraggingOverActive.value = false, isDraggingOverInactive.value = true)
}
const handleDragLeaveSection = () => { isDraggingOverActive.value = false; isDraggingOverInactive.value = false }
const handleDragOverItem = (event: DragEvent, targetItem: TodoItem, index: number, isActive: boolean) => {
  event.preventDefault(); if (!draggedItem.value || draggedItem.value.id === targetItem.id) return
  dropTargetIndex.value = index; dropTargetSection.value = isActive ? 'active' : 'inactive'
}
const handleDragEnd = () => {
  draggedItem.value = null; dropTargetIndex.value = null; dropTargetSection.value = null; isDraggingOverActive.value = false; isDraggingOverInactive.value = false
}
const handleDropOnItem = async (event: DragEvent, targetItem: TodoItem, targetIndex: number, targetIsActive: boolean) => {
  event.stopPropagation(); if (!draggedItem.value || draggedItem.value.id === targetItem.id) { handleDragEnd(); return }
  const sourceIsActive = draggedFromActive.value; const itemToMove = draggedItem.value
  if (sourceIsActive !== targetIsActive) updateUIForSectionMove(itemToMove, targetIsActive, targetIndex)
  else updateUIForReorder(itemToMove, targetIndex, targetIsActive)
  handleDragEnd()
  if (sourceIsActive !== targetIsActive) moveItemBetweenSections(itemToMove, targetIsActive, targetIndex)
  else reorderWithinSection(itemToMove, targetIndex, targetIsActive)
}
const handleDropToSection = async (event: DragEvent, targetIsActive: boolean) => {
  if (!draggedItem.value) { handleDragEnd(); return }
  const sourceIsActive = draggedFromActive.value; const itemToMove = draggedItem.value
  if (sourceIsActive !== targetIsActive) {
    const targetList = targetIsActive ? activeItems.value : inactiveItems.value
    updateUIForSectionMove(itemToMove, targetIsActive, targetList.length)
    handleDragEnd()
    moveItemBetweenSections(itemToMove, targetIsActive, targetList.length)
  } else handleDragEnd()
}
const moveItemBetweenSections = async (item: TodoItem, toActive: boolean, insertIndex: number) => {
  try {
    const targetList = toActive ? items.value.filter(i => i.is_active && i.id !== item.id) : items.value.filter(i => !i.is_active && i.id !== item.id)
    const updates = []
    updates.push({ id: item.id, is_active: toActive, display_order: insertIndex + 1 })
    for (let i = insertIndex; i < targetList.length; i++) { updates.push({ id: targetList[i].id, is_active: toActive, display_order: i + 2 }) }
    for (const update of updates) { await supabase.from('todo_items').update({ is_active: update.is_active, display_order: update.display_order }).eq('id', update.id) }
  } catch (err) { showMessage('error', 'Failed to save changes'); await loadItems() }
}
const reorderWithinSection = async (item: TodoItem, newIndex: number, isActive: boolean) => {
  try {
    const targetList = isActive ? items.value.filter(i => i.is_active) : items.value.filter(i => !i.is_active)
    const oldIndex = targetList.findIndex(i => i.id === item.id); if (oldIndex === -1 || oldIndex === newIndex) return
    const reorderedList = [...targetList]; reorderedList.splice(oldIndex, 1); reorderedList.splice(newIndex, 0, item)
    for (let i = 0; i < reorderedList.length; i++) { await supabase.from('todo_items').update({ display_order: i + 1 }).eq('id', reorderedList[i].id) }
  } catch (err) { showMessage('error', 'Failed to save changes'); await loadItems() }
}
const updateUIForSectionMove = (item: TodoItem, toActive: boolean, insertIndex: number) => {
  const itemIndex = items.value.findIndex(i => i.id === item.id)
  if (itemIndex !== -1) { items.value[itemIndex].is_active = toActive; items.value[itemIndex].display_order = insertIndex + 1 }
  const targetList = toActive ? items.value.filter(i => i.is_active && i.id !== item.id) : items.value.filter(i => !i.is_active && i.id !== item.id)
  targetList.forEach((targetItem, idx) => { if (idx >= insertIndex) { const fullItemIndex = items.value.findIndex(i => i.id === targetItem.id); if (fullItemIndex !== -1) items.value[fullItemIndex].display_order = idx + 2 } })
}
const updateUIForReorder = (item: TodoItem, newIndex: number, isActive: boolean) => {
  const targetList = isActive ? items.value.filter(i => i.is_active) : items.value.filter(i => !i.is_active)
  const oldIndex = targetList.findIndex(i => i.id === item.id); if (oldIndex === -1 || oldIndex === newIndex) return
  const reorderedList = [...targetList]; reorderedList.splice(oldIndex, 1); reorderedList.splice(newIndex, 0, item)
  reorderedList.forEach((reorderedItem, idx) => { const fullItemIndex = items.value.findIndex(i => i.id === reorderedItem.id); if (fullItemIndex !== -1) items.value[fullItemIndex].display_order = idx + 1 })
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

     console.log('isInitialized', isInitialized)

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

watch(activeTab, (newTab) => {
  if (newTab === 'custom') {
    // Only load if we have a date selected, otherwise default to tomorrow logic inside the function or here
    if (!selectedDate.value) {
       selectedDate.value = new Date().toISOString().split('T')[0]
    }

    loadDateTodos()
  }
})

onMounted(() => {
   selectedDate.value = new Date().toISOString().split('T')[0]
   loadItems()
})
</script>