<script setup lang="ts">
const props = defineProps<{ open: boolean; labelledBy?: string }>()
const emit = defineEmits<{ close: [] }>()

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

watch(
  () => props.open,
  open => {
    if (!import.meta.client) return
    document.body.style.overflow = open ? 'hidden' : ''
    if (open) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  },
)

onBeforeUnmount(() => {
  if (!import.meta.client) return
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
        <div class="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" @click="emit('close')" />
        <div
          class="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lift dark:border-white/10 dark:bg-slate-900"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="labelledBy"
        >
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active > div:last-child,
.modal-leave-active > div:last-child {
  transition: transform 0.22s cubic-bezier(0.34, 1.4, 0.64, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div:last-child,
.modal-leave-to > div:last-child {
  transform: translateY(16px) scale(0.97);
}
</style>
