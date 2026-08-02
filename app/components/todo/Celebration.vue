<script setup lang="ts">
defineProps<{ open: boolean; phrase: string; streak?: number }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <Transition name="celebrate">
      <div
        v-if="open"
        class="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Day complete"
      >
        <div class="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" @click="emit('close')" />

        <div
          class="relative flex w-full max-w-sm flex-col items-center overflow-hidden rounded-3xl border border-white/60 bg-white/95 p-9 text-center shadow-lift dark:border-white/10 dark:bg-slate-900/95"
        >
          <div class="absolute -right-6 -top-6 h-24 w-24 animate-blob rounded-full bg-amber-300/50 blur-2xl" />
          <div class="absolute -bottom-6 -left-6 h-24 w-24 animate-blob rounded-full bg-pink-400/50 blur-2xl [animation-delay:2s]" />

          <button
            type="button"
            class="icon-btn absolute right-3 top-3 z-10"
            aria-label="Close"
            @click="emit('close')"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>

          <div class="relative text-6xl">🏆</div>

          <h2
            class="relative mt-4 bg-gradient-to-r from-brand-600 via-violet-600 to-pink-600 bg-clip-text text-4xl font-black tracking-tight text-transparent dark:from-brand-400 dark:via-violet-400 dark:to-pink-400"
          >
            All done
          </h2>

          <div class="relative my-4 h-1 w-16 rounded-full bg-gradient-to-r from-brand-500 to-pink-500" />

          <p class="relative text-base font-medium text-slate-600 dark:text-slate-300">{{ phrase }}</p>

          <p v-if="streak && streak > 1" class="relative mt-4 text-sm font-semibold text-amber-600 dark:text-amber-400">
            🔥 {{ streak }} day streak
          </p>

          <button type="button" class="btn btn-primary relative mt-6 w-full" @click="emit('close')">
            Nice
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.celebrate-enter-active {
  transition: opacity 0.4s ease;
}

.celebrate-leave-active {
  transition: opacity 0.3s ease;
}

.celebrate-enter-active > div:last-child {
  transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.celebrate-enter-from,
.celebrate-leave-to {
  opacity: 0;
}

.celebrate-enter-from > div:last-child {
  transform: scale(0.7) translateY(40px);
}
</style>
