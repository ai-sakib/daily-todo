<script setup lang="ts">
definePageMeta({ layout: 'blank' })
useHead({ title: 'Awaiting approval — Daily' })

const { displayName, avatarUrl, initials, user, signOut } = useAuth()
const { isRejected, lookupFailed, loading, ensureProfile } = useAccess()

const checking = ref(false)

/**
 * Three different reasons to be on this page, and they call for three different
 * messages: a decision has been made against you, we could not reach the
 * database at all, or nobody has looked at your request yet.
 */
const view = computed(() => {
  if (isRejected.value) {
    return {
      icon: '🚫',
      tone: 'rose' as const,
      title: 'Access declined',
      body: 'Your request to join was not approved. If you think that is a mistake, reach out and it can be reviewed again.',
    }
  }

  if (lookupFailed.value) {
    return {
      icon: '⚠️',
      tone: 'amber' as const,
      title: 'Could not check your access',
      body: 'Something went wrong reaching the server, so we could not confirm whether your account is approved. Try again in a moment.',
    }
  }

  return {
    icon: '⏳',
    tone: 'brand' as const,
    title: 'Waiting for approval',
    body: 'Your account has been created and is in the queue. The owner has to let you in before you can start tracking your days — you will get in as soon as that happens.',
  }
})

const toneClasses = {
  brand: 'bg-brand-500/10 text-brand-600 dark:text-brand-300',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
} as const

/**
 * Re-reads the profile. The middleware forwards to the app on the next
 * navigation, so an approval that landed while this page was open is one tap
 * away rather than a sign-out and back in.
 */
async function checkAgain() {
  checking.value = true
  try {
    const profile = await ensureProfile({ force: true })
    if (profile?.status === 'approved') await navigateTo('/')
  } finally {
    checking.value = false
  }
}
</script>

<template>
  <div class="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
    <div class="pointer-events-none absolute -left-24 -top-24 h-72 w-72 animate-blob rounded-full bg-brand-400/20 blur-3xl" />
    <div class="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 animate-blob rounded-full bg-violet-400/20 blur-3xl [animation-delay:3s]" />

    <div class="relative w-full max-w-md">
      <div class="card p-7 text-center">
        <span
          class="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
          :class="toneClasses[view.tone]"
          aria-hidden="true"
        >
          {{ view.icon }}
        </span>

        <h1 class="text-2xl font-bold tracking-tight">{{ view.title }}</h1>
        <p class="mx-auto mt-2.5 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {{ view.body }}
        </p>

        <div class="mt-6 flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
          <img
            v-if="avatarUrl"
            :src="avatarUrl"
            :alt="displayName"
            class="h-9 w-9 rounded-full object-cover ring-1 ring-slate-200 dark:ring-white/10"
          >
          <span
            v-else
            class="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white"
          >
            {{ initials }}
          </span>
          <div class="min-w-0 text-left">
            <p class="truncate text-sm font-semibold">{{ displayName }}</p>
            <p class="truncate text-xs text-slate-500 dark:text-slate-400">{{ user?.email }}</p>
          </div>
        </div>

        <div class="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            class="btn btn-primary flex-1"
            :disabled="checking || loading"
            @click="checkAgain"
          >
            <BaseSpinner v-if="checking" size="sm" />
            <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.9" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h5M20 20v-5h-5M20 9A8 8 0 0 0 5.6 6.6M4 15a8 8 0 0 0 14.4 2.4" />
            </svg>
            {{ checking ? 'Checking…' : 'Check again' }}
          </button>
          <button type="button" class="btn btn-secondary flex-1" @click="signOut">
            Sign out
          </button>
        </div>
      </div>

      <p class="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
        Nothing you do here is lost — your account is kept, it just cannot open the app yet.
      </p>
    </div>
  </div>
</template>
