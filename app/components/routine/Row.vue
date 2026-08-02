<script setup lang="ts">
import type { TodoItem } from '~/types'

const props = defineProps<{ item: TodoItem }>()
const emit = defineEmits<{
  rename: [TodoItem, string]
  'toggle-active': [TodoItem]
  remove: [TodoItem]
}>()

const editing = ref(false)
const draft = ref('')
const input = ref<HTMLInputElement | null>(null)

async function startEdit() {
  draft.value = props.item.item_name
  editing.value = true
  await nextTick()
  input.value?.focus()
  input.value?.select()
}

function commitEdit() {
  if (!editing.value) return
  const name = draft.value.trim()
  if (name && name !== props.item.item_name) emit('rename', props.item, name)
  editing.value = false
}
</script>

<template>
  <li
    class="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-slate-300 dark:border-white/10 dark:bg-slate-900 dark:hover:border-white/20"
    :class="!item.is_active && 'opacity-70'"
  >
    <span
      class="h-2 w-2 shrink-0 rounded-full"
      :class="item.is_active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'"
      aria-hidden="true"
    />

    <div class="min-w-0 flex-1">
      <input
        v-if="editing"
        ref="input"
        v-model="draft"
        type="text"
        class="w-full rounded-lg border border-brand-400 bg-transparent px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        @keydown.enter.prevent="commitEdit"
        @keydown.esc.prevent="editing = false"
        @blur="commitEdit"
      >
      <button
        v-else
        type="button"
        class="block w-full truncate text-left text-sm font-semibold transition hover:text-brand-600 dark:hover:text-brand-400"
        @click="startEdit"
      >
        {{ item.item_name }}
      </button>
    </div>

    <div v-if="!editing" class="flex shrink-0 items-center gap-1">
      <button
        type="button"
        class="btn btn-sm btn-secondary"
        :title="item.is_active ? 'Pause — stops appearing on new days' : 'Resume'"
        @click="emit('toggle-active', item)"
      >
        {{ item.is_active ? 'Pause' : 'Resume' }}
      </button>
      <button
        type="button"
        class="icon-btn hover:!bg-rose-50 hover:!text-rose-600 dark:hover:!bg-rose-500/10"
        title="Delete"
        aria-label="Delete"
        @click="emit('remove', item)"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M10 11v6m4-6v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
        </svg>
      </button>
    </div>
  </li>
</template>
