<script setup lang="ts">
import type { DailyTodo, TodoItem } from '~/types'
import { formatLongDate, formatRelativeDay, shiftDateKey, todayKey } from '~/utils/date'

useHead({ title: 'Plan — Daily' })

type Tab = 'routine' | 'schedule'

const route = useRoute()
const router = useRouter()
const { confirm } = useConfirm()

const tab = ref<Tab>(route.query.tab === 'routine' ? 'routine' : 'schedule')
watch(tab, value => router.replace({ query: { ...route.query, tab: value } }))

/* ------------------------------------------------------------------ routine */

const routine = useRoutine()
const newItemName = ref('')

async function addRoutineItem() {
  if (await routine.add(newItemName.value)) newItemName.value = ''
}

async function removeRoutineItem(item: TodoItem) {
  const ok = await confirm({
    title: `Delete “${item.item_name}”?`,
    message: 'It is removed from today and every future day. Past days keep their record.',
    confirmLabel: 'Delete',
    danger: true,
  })
  if (ok) await routine.remove(item)
}

/* ----------------------------------------------------------------- schedule */

const selectedDate = ref(todayKey())
const schedule = useDailyBoard(selectedDate)
const addingToDate = ref(false)

const minDate = computed(() => todayKey())
const canGoBack = computed(() => selectedDate.value > minDate.value)
const relativeLabel = computed(() => formatRelativeDay(selectedDate.value))
const longLabel = computed(() => formatLongDate(selectedDate.value))

function shift(days: number) {
  const next = shiftDateKey(selectedDate.value, days)
  if (next < minDate.value) return
  selectedDate.value = next
}

async function addToDate(name: string) {
  addingToDate.value = true
  await schedule.add(name)
  addingToDate.value = false
}

async function removeFromDate(todo: DailyTodo) {
  const ok = await confirm({
    title: `Remove “${todo.item_name}”?`,
    message: `It only comes off ${relativeLabel.value.toLowerCase()}. Your routine is untouched.`,
    confirmLabel: 'Remove',
    danger: true,
  })
  if (ok) await schedule.remove(todo)
}

/* -------------------------------------------------------------------- data */

// Each tab fetches on first visit only, so opening Plan costs one query rather
// than two. Kicked off from onMounted so nothing is fetched during SSR.
const loaded = reactive<Record<Tab, boolean>>({ routine: false, schedule: false })

async function ensureLoaded(value: Tab) {
  if (loaded[value]) return
  loaded[value] = true
  await (value === 'schedule' ? schedule.load() : routine.load())
}

watch(tab, ensureLoaded)
onMounted(() => ensureLoaded(tab.value))
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Plan</h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Your everyday routine, and one-off changes to a specific day.
      </p>
    </header>

    <!-- Tabs -->
    <div
      class="inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-slate-900"
      role="tablist"
    >
      <button
        v-for="option in [
          { value: 'schedule' as Tab, label: 'Specific day' },
          { value: 'routine' as Tab, label: 'Routine' },
        ]"
        :key="option.value"
        type="button"
        role="tab"
        :aria-selected="tab === option.value"
        class="rounded-lg px-4 py-2 text-sm font-semibold transition"
        :class="
          tab === option.value
            ? 'bg-brand-600 text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
        "
        @click="tab = option.value"
      >
        {{ option.label }}
      </button>
    </div>

    <!-- ============================ ROUTINE ============================ -->
    <template v-if="tab === 'routine'">
      <section class="card p-5">
        <h2 class="text-base font-semibold">Add to your routine</h2>
        <p class="mb-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
          Active items are copied into every new day automatically.
        </p>

        <form class="flex flex-col gap-2 sm:flex-row" @submit.prevent="addRoutineItem">
          <input
            v-model="newItemName"
            type="text"
            class="input flex-1"
            placeholder="e.g. Read for 30 minutes"
            aria-label="New routine item"
          >
          <button type="submit" class="btn btn-primary" :disabled="!newItemName.trim() || routine.saving.value">
            <BaseSpinner v-if="routine.saving.value" size="sm" />
            <span v-else>Add item</span>
          </button>
        </form>
      </section>

      <BaseSkeletonList v-if="routine.pending.value" :rows="4" />

      <div
        v-else-if="routine.error.value"
        class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200"
      >
        {{ routine.error.value }}
      </div>

      <div v-else-if="routine.items.value.length === 0" class="card">
        <BaseEmptyState
          icon="📋"
          title="No routine yet"
          description="Add the things you want to see every day — reading, exercise, journalling, anything."
        />
      </div>

      <template v-else>
        <section>
          <h2 class="section-title mb-3">
            Active <span class="text-slate-400">({{ routine.activeItems.value.length }})</span>
          </h2>
          <ul v-if="routine.activeItems.value.length > 0" class="space-y-2">
            <RoutineRow
              v-for="item in routine.activeItems.value"
              :key="item.id"
              :item="item"
              @rename="routine.rename"
              @toggle-active="routine.setActive($event, false)"
              @remove="removeRoutineItem"
            />
          </ul>
          <p v-else class="card-muted px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Nothing active — new days will start empty.
          </p>
        </section>

        <section v-if="routine.inactiveItems.value.length > 0">
          <h2 class="section-title mb-3">
            Paused <span class="text-slate-400">({{ routine.inactiveItems.value.length }})</span>
          </h2>
          <ul class="space-y-2">
            <RoutineRow
              v-for="item in routine.inactiveItems.value"
              :key="item.id"
              :item="item"
              @rename="routine.rename"
              @toggle-active="routine.setActive($event, true)"
              @remove="removeRoutineItem"
            />
          </ul>
        </section>
      </template>
    </template>

    <!-- =========================== SCHEDULE ============================ -->
    <template v-else>
      <section class="card p-5">
        <label class="label" for="plan-date">Pick a day</label>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="btn btn-secondary px-3"
            :disabled="!canGoBack"
            aria-label="Previous day"
            @click="shift(-1)"
          >
            ‹
          </button>
          <input
            id="plan-date"
            v-model="selectedDate"
            type="date"
            class="input flex-1"
            :min="minDate"
          >
          <button type="button" class="btn btn-secondary px-3" aria-label="Next day" @click="shift(1)">
            ›
          </button>
        </div>

        <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="font-semibold">{{ relativeLabel }}</p>
            <p class="text-sm text-slate-500 dark:text-slate-400">{{ longLabel }}</p>
          </div>
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            :disabled="schedule.syncing.value"
            @click="schedule.syncRoutine"
          >
            <BaseSpinner v-if="schedule.syncing.value" size="sm" />
            <span>{{ schedule.syncing.value ? 'Syncing…' : 'Pull in routine items' }}</span>
          </button>
        </div>

        <p class="card-muted mt-4 p-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Changes here affect this day only. The first time you open a future day it is filled from
          your active routine; after that it is yours to shape, and removed items stay removed.
        </p>
      </section>

      <TodoQuickAdd
        v-if="!schedule.pending.value"
        :placeholder="`Add something for ${relativeLabel.toLowerCase()}…`"
        :busy="addingToDate"
        @submit="addToDate"
      />

      <BaseSkeletonList v-if="schedule.pending.value" :rows="4" />

      <div v-else-if="schedule.ordered.value.length === 0" class="card">
        <BaseEmptyState icon="📅" title="This day is empty" description="Add an item above or pull in your routine.">
          <button type="button" class="btn btn-secondary" @click="schedule.syncRoutine">
            Pull in routine items
          </button>
        </BaseEmptyState>
      </div>

      <ul v-else class="space-y-2.5">
        <TodoRow
          v-for="todo in schedule.ordered.value"
          :key="todo.id"
          :todo="todo"
          editable
          removable
          @toggle="schedule.toggle"
          @rename="schedule.rename"
          @remove="removeFromDate"
        />
      </ul>
    </template>
  </div>
</template>
