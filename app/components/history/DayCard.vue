<script setup lang="ts">
import type { DailyTodo, HistoryDay } from '~/types'
import { formatLongDate, formatRelativeDay } from '~/utils/date'

const props = defineProps<{ day: HistoryDay; defaultOpen?: boolean }>()
const emit = defineEmits<{ toggle: [DailyTodo]; remove: [DailyTodo] }>()

const open = ref(props.defaultOpen ?? false)

const relative = computed(() => formatRelativeDay(props.day.date))
const full = computed(() => formatLongDate(props.day.date))
</script>

<template>
  <div class="card overflow-hidden">
    <button
      type="button"
      class="flex w-full items-center gap-4 p-4 text-left transition hover:bg-slate-50 dark:hover:bg-white/5"
      :aria-expanded="open"
      @click="open = !open"
    >
      <BaseProgressRing :value="day.progress.percentage" :size="52" :stroke="5">
        <span class="text-xs font-bold tabular-nums">{{ day.progress.percentage }}</span>
      </BaseProgressRing>

      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <h3 class="truncate font-semibold">{{ relative }}</h3>
          <span
            v-if="day.progress.isComplete"
            class="chip bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
          >
            Perfect
          </span>
        </div>
        <p class="truncate text-sm text-slate-500 dark:text-slate-400">{{ full }}</p>
        <p class="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
          {{ day.progress.completed }} of {{ day.progress.total }} completed
        </p>
      </div>

      <svg
        class="h-5 w-5 shrink-0 text-slate-400 transition-transform"
        :class="open && 'rotate-180'"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
      </svg>
    </button>

    <Transition name="expand">
      <div v-if="open" class="border-t border-slate-100 p-3 dark:border-white/5">
        <ul class="space-y-2">
          <TodoRow
            v-for="todo in day.todos"
            :key="todo.id"
            :todo="todo"
            removable
            @toggle="emit('toggle', $event)"
            @remove="emit('remove', $event)"
          />
        </ul>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: opacity 0.2s ease;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
}
</style>
