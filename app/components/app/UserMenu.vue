<script setup lang="ts">
const { displayName, avatarUrl, initials, signOut } = useAuth()
const open = ref(false)
const root = ref<HTMLElement | null>(null)

function onDocumentClick(event: MouseEvent) {
  if (root.value && !root.value.contains(event.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="flex items-center gap-2 rounded-full p-1 pr-2 transition hover:bg-slate-100 dark:hover:bg-white/5"
      :aria-expanded="open"
      aria-haspopup="menu"
      @click="open = !open"
    >
      <img
        v-if="avatarUrl"
        :src="avatarUrl"
        :alt="displayName"
        class="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-white/10"
      >
      <span
        v-else
        class="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white"
      >
        {{ initials }}
      </span>
      <span class="hidden max-w-[10rem] truncate text-sm font-medium sm:block">{{ displayName }}</span>
    </button>

    <Transition name="menu">
      <div
        v-if="open"
        class="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-lift dark:border-white/10 dark:bg-slate-900"
        role="menu"
      >
        <p class="truncate px-3 py-2 text-xs text-slate-500 dark:text-slate-400">{{ displayName }}</p>
        <div class="my-1 h-px bg-slate-100 dark:bg-white/10" />
        <button
          type="button"
          class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
          role="menuitem"
          @click="signOut"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 17l5-5-5-5M20 12H9m3 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h3a3 3 0 0 1 3 3v1" />
          </svg>
          Sign out
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.menu-enter-active,
.menu-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}
</style>
