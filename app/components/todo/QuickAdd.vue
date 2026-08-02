<script setup lang="ts">
const props = withDefaults(
  defineProps<{ placeholder?: string; busy?: boolean }>(),
  { placeholder: 'Add something for this day…', busy: false },
)

const emit = defineEmits<{ submit: [string] }>()

const value = ref('')

async function submit() {
  const name = value.value.trim()
  if (!name || props.busy) return
  emit('submit', name)
  value.value = ''
}
</script>

<template>
  <form class="flex items-center gap-2" @submit.prevent="submit">
    <div class="relative flex-1">
      <svg
        class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" d="M12 5v14m-7-7h14" />
      </svg>
      <input
        v-model="value"
        type="text"
        class="input pl-10"
        :placeholder="placeholder"
        :aria-label="placeholder"
      >
    </div>
    <button type="submit" class="btn btn-primary" :disabled="!value.trim() || busy">
      <BaseSpinner v-if="busy" size="sm" />
      <span v-else>Add</span>
    </button>
  </form>
</template>
