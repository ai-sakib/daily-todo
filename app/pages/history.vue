<script setup lang="ts">
import type { DailyTodo } from '~/types'

useHead({ title: 'History — Daily' })

const { confirm } = useConfirm()
const { range, days, summary, pending, error, load, reset, setRange, setLastDays, toggle, remove } =
  useHistory()

const presets = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
] as const

async function handleRemove(todo: DailyTodo) {
  const ok = await confirm({
    title: `Delete “${todo.item_name}”?`,
    message: 'This permanently removes it from your history.',
    confirmLabel: 'Delete',
    danger: true,
  })
  if (ok) await remove(todo)
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">History</h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Look back at how your days went — and fix anything you forgot to tick.
      </p>
    </header>

    <!-- Range picker -->
    <section class="card space-y-4 p-5">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="preset in presets"
          :key="preset.days"
          type="button"
          class="btn btn-sm btn-secondary"
          @click="setLastDays(preset.days)"
        >
          Last {{ preset.label }}
        </button>
        <button type="button" class="btn btn-sm btn-ghost" @click="reset">Reset</button>
      </div>

      <div class="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label class="label" for="from-date">From</label>
          <input
            id="from-date"
            :value="range.from"
            type="date"
            class="input"
            @change="setRange(($event.target as HTMLInputElement).value, range.to)"
          >
        </div>
        <div>
          <label class="label" for="to-date">To</label>
          <input
            id="to-date"
            :value="range.to"
            type="date"
            class="input"
            @change="setRange(range.from, ($event.target as HTMLInputElement).value)"
          >
        </div>
        <button type="button" class="btn btn-primary" @click="load">Apply</button>
      </div>
    </section>

    <!-- Summary -->
    <section v-if="!pending && summary.tracked > 0" class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <HistoryStatTile label="Days tracked" :value="summary.tracked" />
      <HistoryStatTile label="Average" :value="`${summary.average}%`" hint="completion per day" />
      <HistoryStatTile label="Perfect days" :value="summary.perfect" hint="everything ticked" />
      <HistoryStatTile label="Streak" :value="summary.streak" hint="consecutive perfect days" />
    </section>

    <div
      v-if="error"
      class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200"
    >
      {{ error }}
    </div>

    <BaseSkeletonList v-else-if="pending" :rows="4" />

    <div v-else-if="days.length === 0" class="card">
      <BaseEmptyState
        icon="🗓️"
        title="Nothing in this range"
        description="Try a wider date range, or come back once you have a few days logged."
      />
    </div>

    <div v-else class="space-y-3">
      <HistoryDayCard
        v-for="(day, index) in days"
        :key="day.date"
        :day="day"
        :default-open="index === 0"
        @toggle="toggle"
        @remove="handleRemove"
      />
    </div>
  </div>
</template>
