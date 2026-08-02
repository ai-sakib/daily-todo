<script setup lang="ts">
const links = [
  { to: '/', label: 'Today', icon: 'M5 13l4 4L19 7' },
  { to: '/plan', label: 'Plan', icon: 'M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z' },
  { to: '/history', label: 'History', icon: 'M12 8v4l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' },
] as const
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg sm:hidden dark:border-white/10 dark:bg-slate-900/95"
    aria-label="Main"
  >
    <div class="grid grid-cols-3">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-slate-500 transition dark:text-slate-400"
        active-class="!text-brand-600 dark:!text-brand-400"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.9" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" :d="link.icon" />
        </svg>
        {{ link.label }}
      </NuxtLink>
    </div>
  </nav>
</template>
