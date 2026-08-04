<script setup lang="ts">
const { isAdmin } = useAccess()
const { pendingCount, refreshPendingCount } = useUserAdmin()

// Only admins see the Members tab, and only they pay for the count query.
onMounted(() => {
  if (isAdmin.value) refreshPendingCount()
})

const links = computed(() => [
  { to: '/', label: 'Today', badge: 0 },
  { to: '/plan', label: 'Plan', badge: 0 },
  { to: '/history', label: 'History', badge: 0 },
  ...(isAdmin.value ? [{ to: '/admin', label: 'Members', badge: pendingCount.value }] : []),
])
</script>

<template>
  <header
    class="sticky top-0 z-30 border-b border-slate-200/80 bg-slate-50/85 backdrop-blur-lg dark:border-white/10 dark:bg-slate-950/85"
  >
    <div class="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
      <NuxtLink to="/" class="flex items-center gap-2.5">
        <span
          class="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-sm"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="m5 13 4 4L19 7" />
          </svg>
        </span>
        <span class="text-base font-bold tracking-tight">Daily</span>
      </NuxtLink>

      <nav class="hidden items-center gap-1 sm:flex" aria-label="Main">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100"
          active-class="!bg-white !text-brand-700 shadow-soft dark:!bg-white/10 dark:!text-brand-300"
        >
          {{ link.label }}
          <span
            v-if="link.badge > 0"
            class="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white"
            :aria-label="`${link.badge} waiting for approval`"
          >
            {{ link.badge }}
          </span>
        </NuxtLink>
      </nav>

      <div class="flex items-center gap-1">
        <AppThemeToggle />
        <AppUserMenu />
      </div>
    </div>
  </header>
</template>
