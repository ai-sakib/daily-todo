<script setup lang="ts">
const { toasts, dismiss } = useToast()

const styles = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200',
  error: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200',
  info: 'border-slate-200 bg-white text-slate-800 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100',
} as const

const icons = { success: '✓', error: '!', info: 'i' } as const
</script>

<template>
  <Teleport to="body">
    <div
      class="pointer-events-none fixed inset-x-4 bottom-20 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-20 sm:items-end"
      role="status"
      aria-live="polite"
    >
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto flex w-full items-center gap-3 rounded-xl border px-4 py-3 shadow-lift sm:w-auto sm:min-w-[18rem]"
          :class="styles[toast.kind]"
        >
          <span
            class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/5 text-xs font-bold dark:bg-white/10"
            aria-hidden="true"
          >
            {{ icons[toast.kind] }}
          </span>
          <p class="flex-1 text-sm font-medium">{{ toast.message }}</p>
          <button
            type="button"
            class="shrink-0 rounded-md p-1 opacity-60 transition hover:opacity-100"
            aria-label="Dismiss"
            @click="dismiss(toast.id)"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.28s cubic-bezier(0.34, 1.4, 0.64, 1);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.97);
}

.toast-leave-active {
  position: absolute;
}
</style>
