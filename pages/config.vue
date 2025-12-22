<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <div class="container mx-auto px-4 py-8 max-w-6xl">
      <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 class="text-2xl md:text-3xl font-bold text-gray-800">Configure Items</h1>
            <p class="text-sm md:text-base text-gray-600 mt-1">Drag and drop to reorder</p>
          </div>
          <NuxtLink
            to="/"
            class="w-full md:w-auto text-center px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
          >
            ← Back to Home
          </NuxtLink>
        </div>
      </div>

      <!-- Add New Item Form -->
      <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">Add New Todo Item</h2>
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
            {{ isSubmitting ? 'Adding...' : '+ Add Item' }}
          </button>
        </form>
      </div>

      <!-- Error/Success Messages -->
      <div v-if="message" class="mb-6 p-4 rounded-lg" :class="message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'">
        {{ message.text }}
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="bg-white rounded-lg shadow-lg p-8 text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
        <p class="mt-4 text-gray-600">Loading items...</p>
      </div>

      <!-- Two Column Layout: Active vs Inactive -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Active Items (Left Column) -->
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
                class="relative border-2 rounded-lg p-4 transition-all duration-200"
                :class="{
                  'opacity-40 scale-95': draggedItem?.id === item.id,
                  'border-gray-200 hover:border-indigo-300 hover:shadow-md bg-white cursor-grab active:cursor-grabbing': draggedItem?.id !== item.id && editingId !== item.id,
                  'border-indigo-400 bg-indigo-50 transform translate-y-1': dropTargetIndex === index && dropTargetSection === 'active' && draggedItem?.id !== item.id,
                  'cursor-default border-gray-300': editingId === item.id
                }"
              >
                <!-- Drop indicator line above -->
                <div 
                  v-if="dropTargetIndex === index && dropTargetSection === 'active' && draggedItem?.id !== item.id"
                  class="absolute -top-1 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"
                ></div>

                <div v-if="editingId === item.id" class="space-y-3">
                  <!-- Edit Mode -->
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

                <div v-else class="flex items-center gap-3">
                  <!-- Drag Handle -->
                  <div class="flex flex-col gap-1 text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0">
                    <div class="flex gap-1">
                      <div class="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                      <div class="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                    </div>
                    <div class="flex gap-1">
                      <div class="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                      <div class="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                    </div>
                    <div class="flex gap-1">
                      <div class="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                      <div class="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                    </div>
                  </div>

                  <!-- Priority Badge -->
                  <div class="flex-shrink-0 w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {{ index + 1 }}
                  </div>

                  <!-- Item Info -->
                  <div class="flex-1 min-w-0">
                    <h3 class="font-semibold text-gray-800 truncate">{{ item.item_name }}</h3>
                  </div>

                  <!-- Actions -->
                  <div class="flex items-center gap-2 flex-shrink-0">
                    <button
                      @click="startEdit(item)"
                      class="px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition text-sm"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    
                    <button
                      @click="toggleActive(item)"
                      class="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-sm"
                      title="Move to Inactive"
                    >
                      →
                    </button>
                    
                    <button
                      @click="deleteItem(item)"
                      class="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>

              <!-- Drop zone at the end -->
              <div
                v-if="dropTargetIndex === activeItems.length && dropTargetSection === 'active'"
                class="h-12 border-2 border-dashed border-indigo-400 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 text-sm"
              >
                Drop here
              </div>
            </div>
          </div>
        </div>

        <!-- Inactive Items (Right Column) -->
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
                class="relative border-2 rounded-lg p-4 transition-all duration-200 opacity-75 hover:opacity-100"
                :class="{
                  'opacity-20 scale-95': draggedItem?.id === item.id,
                  'border-gray-200 hover:border-gray-400 hover:shadow-md bg-white cursor-grab active:cursor-grabbing': draggedItem?.id !== item.id && editingId !== item.id,
                  'border-gray-400 bg-gray-100 transform translate-y-1': dropTargetIndex === index && dropTargetSection === 'inactive' && draggedItem?.id !== item.id,
                  'cursor-default border-gray-300': editingId === item.id
                }"
              >
                <!-- Drop indicator line above -->
                <div 
                  v-if="dropTargetIndex === index && dropTargetSection === 'inactive' && draggedItem?.id !== item.id"
                  class="absolute -top-1 left-0 right-0 h-0.5 bg-gray-500 rounded-full"
                ></div>

                <div v-if="editingId === item.id" class="space-y-3">
                  <!-- Edit Mode -->
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

                <div v-else class="flex items-center gap-3">
                  <!-- Drag Handle -->
                  <div class="flex flex-col gap-1 text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0">
                    <div class="flex gap-1">
                      <div class="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                      <div class="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                    </div>
                    <div class="flex gap-1">
                      <div class="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                      <div class="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                    </div>
                    <div class="flex gap-1">
                      <div class="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                      <div class="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                    </div>
                  </div>

                  <!-- Item Info -->
                  <div class="flex-1 min-w-0">
                    <h3 class="font-semibold text-gray-600 truncate">{{ item.item_name }}</h3>
                  </div>

                  <!-- Actions -->
                  <div class="flex items-center gap-2 flex-shrink-0">
                    <button
                      @click="startEdit(item)"
                      class="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-sm"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    
                    <button
                      @click="toggleActive(item)"
                      class="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition text-sm"
                      title="Move to Active"
                    >
                      ←
                    </button>
                    
                    <button
                      @click="deleteItem(item)"
                      class="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>

              <!-- Drop zone at the end -->
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

      <!-- Instructions -->
      <div class="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 class="font-semibold text-blue-900 mb-2">💡 How to use:</h3>
        <ul class="text-sm text-blue-800 space-y-1">
          <li>• <strong>Drag and drop</strong> items within Active section to change priority</li>
          <li>• <strong>Drag between sections</strong> to activate/deactivate items</li>
          <li>• <strong>Top item in Active</strong> section appears first on home page</li>
          <li>• <strong>Inactive items</strong> are saved but won't appear in daily todos</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TodoItem } from '~/types'

const supabase = useSupabase()
const { user } = useSupabaseUser()

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

const newItem = ref({
  name: ''
})

const editForm = ref({
  name: ''
})

const message = ref<{ type: 'success' | 'error', text: string } | null>(null)

const activeItems = computed(() => 
  items.value.filter(item => item.is_active).sort((a, b) => a.display_order - b.display_order)
)

const inactiveItems = computed(() => 
  items.value.filter(item => !item.is_active).sort((a, b) => a.display_order - b.display_order)
)

const showMessage = (type: 'success' | 'error', text: string) => {
  message.value = { type, text }
  setTimeout(() => {
    message.value = null
  }, 3000)
}

const generateKey = (name: string): string => {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50) + '_' + Date.now()
}

const loadItems = async () => {
  try {
    loading.value = true
    
    // Get current user
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      navigateTo('/login')
      return
    }
    
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

    // Get current user
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      showMessage('error', 'You must be logged in')
      return
    }

    const activeItemsCount = activeItems.value.length
    const maxOrder = activeItemsCount > 0 
      ? Math.max(...activeItems.value.map(i => i.display_order))
      : 0

    const { error } = await supabase
      .from('todo_items')
      .insert({
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

const handleDragStart = (event: DragEvent, item: TodoItem, index: number, isActive: boolean) => {
  draggedItem.value = item
  draggedFromActive.value = isActive
  
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', item.id)
  }
}

const handleDragOverSection = (event: DragEvent, isActive: boolean) => {
  event.preventDefault()
  if (isActive) {
    isDraggingOverActive.value = true
    isDraggingOverInactive.value = false
  } else {
    isDraggingOverActive.value = false
    isDraggingOverInactive.value = true
  }
}

const handleDragLeaveSection = () => {
  isDraggingOverActive.value = false
  isDraggingOverInactive.value = false
}

const handleDragOverItem = (event: DragEvent, targetItem: TodoItem, index: number, isActive: boolean) => {
  event.preventDefault()
  
  if (!draggedItem.value || draggedItem.value.id === targetItem.id) return
  
  dropTargetIndex.value = index
  dropTargetSection.value = isActive ? 'active' : 'inactive'
}

const handleDragEnd = () => {
  draggedItem.value = null
  dropTargetIndex.value = null
  dropTargetSection.value = null
  isDraggingOverActive.value = false
  isDraggingOverInactive.value = false
}

const handleDropOnItem = async (event: DragEvent, targetItem: TodoItem, targetIndex: number, targetIsActive: boolean) => {
  event.stopPropagation()
  
  if (!draggedItem.value || draggedItem.value.id === targetItem.id) {
    handleDragEnd()
    return
  }

  const sourceIsActive = draggedFromActive.value
  const itemToMove = draggedItem.value

  // Optimistically update UI immediately
  if (sourceIsActive !== targetIsActive) {
    // Moving between sections - update locally
    updateUIForSectionMove(itemToMove, targetIsActive, targetIndex)
  } else {
    // Reordering within same section - update locally
    updateUIForReorder(itemToMove, targetIndex, targetIsActive)
  }

  handleDragEnd()

  // Save to database in background
  if (sourceIsActive !== targetIsActive) {
    moveItemBetweenSections(itemToMove, targetIsActive, targetIndex)
  } else {
    reorderWithinSection(itemToMove, targetIndex, targetIsActive)
  }
}

const handleDropToSection = async (event: DragEvent, targetIsActive: boolean) => {
  if (!draggedItem.value) {
    handleDragEnd()
    return
  }

  const sourceIsActive = draggedFromActive.value
  const itemToMove = draggedItem.value

  if (sourceIsActive !== targetIsActive) {
    const targetList = targetIsActive ? activeItems.value : inactiveItems.value
    
    // Optimistically update UI immediately
    updateUIForSectionMove(itemToMove, targetIsActive, targetList.length)
    
    handleDragEnd()
    
    // Save to database in background
    moveItemBetweenSections(itemToMove, targetIsActive, targetList.length)
  } else {
    handleDragEnd()
  }
}

const moveItemBetweenSections = async (item: TodoItem, toActive: boolean, insertIndex: number) => {
  try {
    const targetList = toActive ? 
      items.value.filter(i => i.is_active && i.id !== item.id) : 
      items.value.filter(i => !i.is_active && i.id !== item.id)
    
    // Calculate new orders for all affected items
    const updates = []
    
    // Update the moved item
    updates.push({
      id: item.id,
      is_active: toActive,
      display_order: insertIndex + 1
    })
    
    // Update items in target section that come at or after the insert position
    for (let i = insertIndex; i < targetList.length; i++) {
      updates.push({
        id: targetList[i].id,
        is_active: toActive,
        display_order: i + 2
      })
    }
    
    // Execute all updates in background
    for (const update of updates) {
      await supabase
        .from('todo_items')
        .update({ 
          is_active: update.is_active,
          display_order: update.display_order
        })
        .eq('id', update.id)
    }
  } catch (err: any) {
    showMessage('error', 'Failed to save changes')
    console.error(err)
    // Reload on error to get correct state
    await loadItems()
  }
}

const reorderWithinSection = async (item: TodoItem, newIndex: number, isActive: boolean) => {
  try {
    const targetList = isActive ? 
      items.value.filter(i => i.is_active) : 
      items.value.filter(i => !i.is_active)
    
    const oldIndex = targetList.findIndex(i => i.id === item.id)
    if (oldIndex === -1 || oldIndex === newIndex) return

    // Remove item from old position
    const reorderedList = [...targetList]
    reorderedList.splice(oldIndex, 1)
    // Insert at new position
    reorderedList.splice(newIndex, 0, item)

    // Update display_order for all items in background
    for (let i = 0; i < reorderedList.length; i++) {
      await supabase
        .from('todo_items')
        .update({ display_order: i + 1 })
        .eq('id', reorderedList[i].id)
    }
  } catch (err: any) {
    showMessage('error', 'Failed to save changes')
    console.error(err)
    // Reload on error to get correct state
    await loadItems()
  }
}

const updateUIForSectionMove = (item: TodoItem, toActive: boolean, insertIndex: number) => {
  // Find and update the item in the items array
  const itemIndex = items.value.findIndex(i => i.id === item.id)
  if (itemIndex !== -1) {
    items.value[itemIndex].is_active = toActive
    items.value[itemIndex].display_order = insertIndex + 1
  }
  
  // Update display_order for items after the insert position in target section
  const targetList = toActive ? 
    items.value.filter(i => i.is_active && i.id !== item.id) : 
    items.value.filter(i => !i.is_active && i.id !== item.id)
  
  targetList.forEach((targetItem, idx) => {
    if (idx >= insertIndex) {
      const fullItemIndex = items.value.findIndex(i => i.id === targetItem.id)
      if (fullItemIndex !== -1) {
        items.value[fullItemIndex].display_order = idx + 2
      }
    }
  })
}

const updateUIForReorder = (item: TodoItem, newIndex: number, isActive: boolean) => {
  const targetList = isActive ? 
    items.value.filter(i => i.is_active) : 
    items.value.filter(i => !i.is_active)
  
  const oldIndex = targetList.findIndex(i => i.id === item.id)
  if (oldIndex === -1 || oldIndex === newIndex) return

  // Create reordered list
  const reorderedList = [...targetList]
  reorderedList.splice(oldIndex, 1)
  reorderedList.splice(newIndex, 0, item)

  // Update display_order in the items array
  reorderedList.forEach((reorderedItem, idx) => {
    const fullItemIndex = items.value.findIndex(i => i.id === reorderedItem.id)
    if (fullItemIndex !== -1) {
      items.value[fullItemIndex].display_order = idx + 1
    }
  })
}

const toggleActive = async (item: TodoItem) => {
  const newActiveState = !item.is_active
  const targetList = newActiveState ? activeItems.value : inactiveItems.value
  const newOrder = targetList.length + 1

  // Optimistically update UI immediately
  const itemIndex = items.value.findIndex(i => i.id === item.id)
  if (itemIndex !== -1) {
    items.value[itemIndex].is_active = newActiveState
    items.value[itemIndex].display_order = newOrder
  }

  // Save to database in background
  supabase
    .from('todo_items')
    .update({ 
      is_active: newActiveState,
      display_order: newOrder
    })
    .eq('id', item.id)
    .then(({ error }) => {
      if (error) {
        showMessage('error', 'Failed to save changes')
        loadItems() // Reload on error
      }
    })
}

const startEdit = (item: TodoItem) => {
  editingId.value = item.id
  editForm.value = {
    name: item.item_name
  }
}

const cancelEdit = () => {
  editingId.value = null
  editForm.value = { name: '' }
}

const saveEdit = async (itemId: string) => {
  try {
    const { error } = await supabase
      .from('todo_items')
      .update({
        item_name: editForm.value.name,
        item_key: generateKey(editForm.value.name)
      })
      .eq('id', itemId)

    if (error) throw error

    showMessage('success', 'Item updated successfully!')
    editingId.value = null
    await loadItems()
  } catch (err: any) {
    showMessage('error', err.message || 'Failed to update item')
  }
}

const deleteItem = async (item: TodoItem) => {
  if (!confirm(`Are you sure you want to delete "${item.item_name}"?`)) {
    return
  }

  try {
    const { error } = await supabase
      .from('todo_items')
      .delete()
      .eq('id', item.id)

    if (error) throw error

    showMessage('success', 'Item deleted successfully!')
    await loadItems()
  } catch (err: any) {
    showMessage('error', err.message || 'Failed to delete item')
  }
}

onMounted(() => {
  loadItems()
})
</script>