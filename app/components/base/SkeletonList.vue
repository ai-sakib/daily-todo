<script setup lang="ts">
withDefaults(defineProps<{ rows?: number }>(), { rows: 4 })
</script>

<template>
  <div class="space-y-2.5" role="status" aria-label="Loading">
    <div
      v-for="row in rows"
      :key="row"
      class="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900"
    >
      <div class="skeleton h-6 w-6 rounded-full" />
      <div class="skeleton h-4" :style="{ width: `${45 + ((row * 13) % 35)}%` }" />
    </div>
  </div>
</template>
