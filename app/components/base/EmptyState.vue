<script setup lang="ts">
defineProps<{
  icon?: string
  title: string
  description?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center px-6 py-14 text-center">
    <div
      v-if="icon"
      class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl dark:bg-white/5"
      aria-hidden="true"
    >
      {{ icon }}
    </div>
    <h3 class="text-base font-semibold text-slate-800 dark:text-slate-100">{{ title }}</h3>
    <p v-if="description" class="mt-1.5 max-w-sm text-sm text-slate-500 dark:text-slate-400">
      {{ description }}
    </p>
    <div v-if="$slots.default" class="mt-5">
      <slot />
    </div>
  </div>
</template>
