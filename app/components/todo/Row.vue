<script setup lang="ts">
import type { DailyTodo } from '~/types'
import { formatTime } from '~/utils/date'

const props = defineProps<{
  todo: DailyTodo
  /** Allow inline renaming by clicking the title or the pencil. */
  editable?: boolean
  /** Show the delete action. */
  removable?: boolean
}>()
const emit = defineEmits<{
  toggle: [DailyTodo]
  rename: [DailyTodo, string]
  remove: [DailyTodo]
}>()

const editing = ref(false)
const draft = ref('')
const input = ref<HTMLInputElement | null>(null)

async function startEdit() {
  if (!props.editable) return
  draft.value = props.todo.item_name
  editing.value = true
  await nextTick()
  input.value?.focus()
  input.value?.select()
}

function cancelEdit() {
  editing.value = false
  draft.value = ''
}

function commitEdit() {
  if (!editing.value) return
  const name = draft.value.trim()
  if (name && name !== props.todo.item_name) emit('rename', props.todo, name)
  editing.value = false
}
</script>

<template>
  <li
    class="group relative flex items-center gap-3 rounded-2xl border bg-white p-3 pr-2 transition-all duration-200 dark:bg-slate-900"
    :class="
      todo.is_completed
        ? 'border-slate-200/70 dark:border-white/5'
        : 'border-slate-200 hover:border-brand-300 hover:shadow-soft dark:border-white/10 dark:hover:border-brand-500/40'
    "
  >
    <!-- Checkbox -->
    <button
      type="button"
      role="checkbox"
      :aria-checked="todo.is_completed"
      :aria-label="todo.item_name"
      class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition active:scale-90"
      :class="
        todo.is_completed
          ? 'border-emerald-500 bg-emerald-500 text-white'
          : 'border-slate-300 text-transparent hover:border-brand-500 dark:border-white/20'
      "
      @click="emit('toggle', todo)"
    >
      <svg
        class="h-4 w-4"
        :class="todo.is_completed && 'animate-pop-in'"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="m5 13 4 4L19 7" />
      </svg>
    </button>

    <!-- Name / inline editor -->
    <div class="min-w-0 flex-1">
      <input
        v-if="editing"
        ref="input"
        v-model="draft"
        type="text"
        class="w-full rounded-lg border border-brand-400 bg-transparent px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        @keydown.enter.prevent="commitEdit"
        @keydown.esc.prevent="cancelEdit"
        @blur="commitEdit"
      >
      <template v-else>
        <button
          type="button"
          class="block w-full truncate text-left text-[0.95rem] font-medium transition"
          :class="
            todo.is_completed
              ? 'text-slate-400 line-through dark:text-slate-500'
              : 'text-slate-800 dark:text-slate-100'
          "
          :title="editable ? 'Click to rename' : undefined"
          @click="editable ? startEdit() : emit('toggle', todo)"
        >
          {{ todo.item_name }}
        </button>
        <span
          v-if="todo.is_completed && todo.completed_at"
          class="mt-0.5 block text-xs text-emerald-600 dark:text-emerald-400"
        >
          Done at {{ formatTime(todo.completed_at) }}
        </span>
      </template>
    </div>

    <!-- Actions -->
    <div
      v-if="(editable || removable) && !editing"
      class="flex shrink-0 items-center opacity-0 transition group-hover:opacity-100 focus-within:opacity-100 max-sm:opacity-100"
    >
      <button v-if="editable" type="button" class="icon-btn" title="Rename" aria-label="Rename" @click="startEdit">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>
      <button
        v-if="removable"
        type="button"
        class="icon-btn hover:!bg-rose-50 hover:!text-rose-600 dark:hover:!bg-rose-500/10"
        title="Remove"
        aria-label="Remove"
        @click="emit('remove', todo)"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M10 11v6m4-6v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
        </svg>
      </button>
    </div>
  </li>
</template>
