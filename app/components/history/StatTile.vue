<script setup lang="ts">
defineProps<{ label: string; value: string | number; hint?: string }>()
</script>

<template>
  <div class="card p-4">
    <p class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {{ label }}
    </p>
    <p class="mt-1.5 text-2xl font-bold tabular-nums">{{ value }}</p>
    <p v-if="hint" class="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{{ hint }}</p>
  </div>
</template>
