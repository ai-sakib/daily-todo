<script setup lang="ts">
withDefaults(defineProps<{ size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' })

const sizes = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
} as const
</script>

<template>
  <span
    class="inline-block animate-spin rounded-full border-current border-r-transparent align-[-0.125em]"
    :class="sizes[size]"
    role="status"
    aria-label="Loading"
  />
</template>
