<script setup lang="ts">
import type { DailyTodo } from '~/types'
import { formatLongDate, greetingForNow, todayKey } from '~/utils/date'

useHead({ title: 'Today — Daily' })

const { displayName } = useAuth()
const { confirm } = useConfirm()
const { streak, load: loadStreak } = useStreak()

const date = ref(todayKey())
const { openTodos, doneTodos, progress, pending, error, load, toggle, add, rename, remove } =
  useDailyBoard(date)
const celebration = useCelebration()

const adding = ref(false)
const showCompleted = ref(true)

// Time-of-day text is client-only: the server has no idea which timezone the
// user is in, and rendering it during SSR would mismatch on hydration.
const heading = computed(() => `${greetingForNow()}, ${displayName.value.split(' ')[0]}`)
const longDate = computed(() => formatLongDate(date.value))

async function handleAdd(name: string) {
  adding.value = true
  await add(name)
  adding.value = false
}

async function handleRemove(todo: DailyTodo) {
  const ok = await confirm({
    title: `Remove “${todo.item_name}”?`,
    message: 'This only affects today — your routine stays as it is.',
    confirmLabel: 'Remove',
    danger: true,
  })
  if (ok) await remove(todo)
}

// Celebrate the moment the last box is ticked. On load we show the banner for an
// already-finished day, but without replaying the confetti.
watch(
  () => progress.value.isComplete,
  (complete, wasComplete) => {
    if (complete && !wasComplete) {
      celebration.celebrate(true)
      void loadStreak()
    }
  },
)

onMounted(async () => {
  await load()
  void loadStreak()
  if (progress.value.isComplete) celebration.celebrate(false)
})
</script>

<template>
  <div class="space-y-6">
    <!-- Hero -->
    <section class="card overflow-hidden">
      <div class="flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div class="min-w-0">
          <ClientOnly>
            <h1 class="truncate text-2xl font-bold tracking-tight sm:text-3xl">{{ heading }}</h1>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ longDate }}</p>
            <template #fallback>
              <div class="skeleton h-8 w-56" />
              <div class="skeleton mt-2 h-4 w-40" />
            </template>
          </ClientOnly>

          <div class="mt-4 flex flex-wrap items-center gap-2">
            <span
              v-if="streak > 0"
              class="chip bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
            >
              🔥 {{ streak }} day streak
            </span>
            <span
              v-if="progress.total > 0"
              class="chip bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300"
            >
              {{ progress.completed }} of {{ progress.total }} done
            </span>
          </div>
        </div>

        <BaseProgressRing :value="progress.percentage" :size="104">
          <span class="text-2xl font-bold tabular-nums">{{ progress.percentage }}%</span>
          <span class="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {{ progress.remaining }} left
          </span>
        </BaseProgressRing>
      </div>

      <BaseProgressBar :value="progress.percentage" class="!rounded-none" />
    </section>

    <!-- Quick add -->
    <TodoQuickAdd
      v-if="!pending && !error"
      placeholder="Add a task just for today…"
      :busy="adding"
      @submit="handleAdd"
    />

    <div
      v-if="error"
      class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200"
    >
      {{ error }}
    </div>

    <BaseSkeletonList v-else-if="pending" :rows="5" />

    <div v-else-if="progress.total === 0" class="card">
      <BaseEmptyState
        icon="🌱"
        title="Nothing planned for today"
        description="Build a routine of things you want to do every day, or add a one-off task above."
      >
        <NuxtLink to="/plan" class="btn btn-primary">Set up my routine</NuxtLink>
      </BaseEmptyState>
    </div>

    <template v-else>
      <section v-if="openTodos.length > 0">
        <h2 class="section-title mb-3">
          To do <span class="text-slate-400">({{ openTodos.length }})</span>
        </h2>
        <TransitionGroup tag="ul" name="list" class="relative space-y-2.5">
          <TodoRow
            v-for="todo in openTodos"
            :key="todo.id"
            :todo="todo"
            editable
            removable
            @toggle="toggle"
            @rename="rename"
            @remove="handleRemove"
          />
        </TransitionGroup>
      </section>

      <section v-if="doneTodos.length > 0">
        <button
          type="button"
          class="section-title mb-3 flex items-center gap-1.5 transition hover:text-slate-700 dark:hover:text-slate-200"
          :aria-expanded="showCompleted"
          @click="showCompleted = !showCompleted"
        >
          Completed <span class="text-slate-400">({{ doneTodos.length }})</span>
          <svg
            class="h-4 w-4 transition-transform"
            :class="showCompleted && 'rotate-180'"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
          </svg>
        </button>

        <TransitionGroup v-show="showCompleted" tag="ul" name="list" class="relative space-y-2.5">
          <TodoRow
            v-for="todo in doneTodos"
            :key="todo.id"
            :todo="todo"
            editable
            removable
            @toggle="toggle"
            @rename="rename"
            @remove="handleRemove"
          />
        </TransitionGroup>
      </section>
    </template>

    <TodoCelebration
      :open="celebration.visible.value"
      :phrase="celebration.phrase.value"
      :streak="streak"
      @close="celebration.dismiss"
    />
  </div>
</template>

<style scoped>
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

.list-leave-active {
  position: absolute;
  width: 100%;
}
</style>
