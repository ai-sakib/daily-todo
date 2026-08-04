<script setup lang="ts">
definePageMeta({ layout: 'blank' })
useHead({ title: 'Sign in — Daily' })

const route = useRoute()
const { signInWithGoogle } = useAuth()

const loading = ref(false)
const error = ref<string | null>(null)

const perks = [
  'One clean list, refreshed every morning',
  'Routines that carry over automatically',
  'Streaks and history to keep you honest',
] as const

async function handleGoogleLogin() {
  loading.value = true
  error.value = null

  try {
    const redirectTo = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    const { error: signInError } = await signInWithGoogle(redirectTo)
    if (signInError) throw signInError
    // The browser navigates to Google from here.
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not start sign in.'
    loading.value = false
  }
}
</script>

<template>
  <div class="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
    <div class="pointer-events-none absolute -left-24 -top-24 h-72 w-72 animate-blob rounded-full bg-brand-400/25 blur-3xl" />
    <div class="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 animate-blob rounded-full bg-violet-400/25 blur-3xl [animation-delay:3s]" />

    <div class="relative w-full max-w-sm">
      <div class="mb-8 text-center">
        <span
          class="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-lift"
        >
          <svg class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="m5 13 4 4L19 7" />
          </svg>
        </span>
        <h1 class="text-3xl font-bold tracking-tight">Daily</h1>
        <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          One day at a time. Track the habits that matter.
        </p>
      </div>

      <div class="card p-6">
        <div
          v-if="error"
          class="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200"
        >
          {{ error }}
        </div>

        <button
          type="button"
          class="btn btn-secondary w-full py-3"
          :disabled="loading"
          @click="handleGoogleLogin"
        >
          <BaseSpinner v-if="loading" size="sm" />
          <svg v-else class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span>{{ loading ? 'Signing in…' : 'Continue with Google' }}</span>
        </button>

        <ul class="mt-6 space-y-2.5 border-t border-slate-100 pt-6 dark:border-white/5">
          <li
            v-for="perk in perks"
            :key="perk"
            class="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300"
          >
            <svg class="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="m5 13 4 4L19 7" />
            </svg>
            {{ perk }}
          </li>
        </ul>
      </div>

      <p class="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
        Your data is private to your account. New sign-ups need the owner's approval
        before the app opens.
      </p>
    </div>
  </div>
</template>
