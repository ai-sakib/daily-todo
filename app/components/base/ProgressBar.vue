<script setup lang="ts">
defineProps<{ value: number }>()
</script>

<template>
  <div
    class="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"
    role="progressbar"
    :aria-valuenow="value"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div
      class="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-[width] duration-500 ease-out"
      :style="{ width: `${Math.min(Math.max(value, 0), 100)}%` }"
    />
  </div>
</template>
