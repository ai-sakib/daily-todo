<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const isNotFound = computed(() => props.error?.statusCode === 404)
</script>

<template>
  <div class="flex min-h-screen items-center justify-center p-4">
    <div class="card w-full max-w-md p-8 text-center">
      <p class="text-5xl font-black text-slate-200 dark:text-white/10">{{ error?.statusCode ?? 500 }}</p>
      <h1 class="mt-3 text-xl font-bold">
        {{ isNotFound ? 'Page not found' : 'Something went wrong' }}
      </h1>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {{ isNotFound ? 'That page does not exist — or it moved.' : error?.message || 'Please try again.' }}
      </p>
      <button type="button" class="btn btn-primary mt-6 w-full" @click="clearError({ redirect: '/' })">
        Back to today
      </button>
    </div>
  </div>
</template>
