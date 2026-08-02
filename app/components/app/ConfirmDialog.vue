<script setup lang="ts">
const { state, resolve } = useConfirm()
</script>

<template>
  <BaseModal :open="state.open" labelled-by="confirm-title" @close="resolve(false)">
    <h2 id="confirm-title" class="text-lg font-bold">{{ state.title }}</h2>
    <p v-if="state.message" class="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
      {{ state.message }}
    </p>

    <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button type="button" class="btn btn-secondary" @click="resolve(false)">
        {{ state.cancelLabel ?? 'Cancel' }}
      </button>
      <button
        type="button"
        class="btn"
        :class="state.danger ? 'btn-danger' : 'btn-primary'"
        @click="resolve(true)"
      >
        {{ state.confirmLabel ?? 'Confirm' }}
      </button>
    </div>
  </BaseModal>
</template>
