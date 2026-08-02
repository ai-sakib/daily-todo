<script setup lang="ts">
definePageMeta({ layout: 'blank' })
useHead({ title: 'Signing in — Daily' })

const { user, consumePostLoginPath } = useAuth()

// The Supabase module exchanges the OAuth code and populates the user; as soon
// as it lands we forward to wherever the user was originally headed.
watch(
  user,
  value => {
    if (!value) return
    return navigateTo(consumePostLoginPath(), { replace: true })
  },
  { immediate: true },
)
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-4 text-slate-500 dark:text-slate-400">
    <BaseSpinner size="lg" class="text-brand-600 dark:text-brand-400" />
    <p class="text-sm">Completing sign in…</p>
  </div>
</template>
