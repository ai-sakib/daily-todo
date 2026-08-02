<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    value: number
    size?: number
    stroke?: number
  }>(),
  { size: 96, stroke: 8 },
)

const radius = computed(() => (props.size - props.stroke) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const offset = computed(() => circumference.value * (1 - Math.min(Math.max(props.value, 0), 100) / 100))
</script>

<template>
  <div
    class="relative inline-flex shrink-0 items-center justify-center"
    :style="{ width: `${size}px`, height: `${size}px` }"
    role="img"
    :aria-label="`${value}% complete`"
  >
    <svg :width="size" :height="size" class="-rotate-90">
      <circle
        class="text-slate-200 dark:text-white/10"
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        :stroke-width="stroke"
        stroke="currentColor"
        fill="none"
      />
      <circle
        class="text-brand-600 transition-[stroke-dashoffset] duration-700 ease-out dark:text-brand-400"
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        :stroke-width="stroke"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="offset"
        stroke="currentColor"
        stroke-linecap="round"
        fill="none"
      />
    </svg>
    <div class="absolute inset-0 flex flex-col items-center justify-center">
      <slot>
        <span class="text-xl font-bold tabular-nums">{{ value }}%</span>
      </slot>
    </div>
  </div>
</template>
