<script setup lang="ts">
const { theme, toggle, syncFromDocument } = useTheme()

onMounted(syncFromDocument)
</script>

<template>
  <ClientOnly>
    <button
      type="button"
      class="icon-btn"
      :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
      :title="theme === 'dark' ? 'Light mode' : 'Dark mode'"
      @click="toggle"
    >
      <svg v-if="theme === 'dark'" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="4" />
        <path stroke-linecap="round" d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
      </svg>
    </button>
    <template #fallback>
      <span class="h-9 w-9" />
    </template>
  </ClientOnly>
</template>
