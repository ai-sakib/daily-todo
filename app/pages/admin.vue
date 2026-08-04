<script setup lang="ts">
import type { Profile } from '~/types'
import { profileName } from '~/composables/useUserAdmin'

useHead({ title: 'Members — Daily' })

const admin = useUserAdmin()
const { confirm } = useConfirm()

// Loaded from onMounted rather than during SSR, matching the other pages.
onMounted(admin.load)

async function decline(profile: Profile) {
  const ok = await confirm({
    title: `Decline ${profileName(profile)}?`,
    message: 'They keep their account but stay locked out. You can approve them later.',
    confirmLabel: 'Decline',
    danger: true,
  })
  if (ok) await admin.decline(profile)
}

async function revoke(profile: Profile) {
  const ok = await confirm({
    title: `Revoke access for ${profileName(profile)}?`,
    message: 'They go back to the waiting list immediately. Their data is kept.',
    confirmLabel: 'Revoke',
    danger: true,
  })
  if (ok) await admin.revoke(profile)
}

const sections = computed(() => [
  {
    key: 'waiting',
    title: 'Waiting for approval',
    empty: 'Nobody is waiting right now.',
    rows: admin.waiting.value,
  },
  {
    key: 'approved',
    title: 'Approved',
    empty: 'No approved members yet.',
    rows: admin.approved.value,
  },
  {
    key: 'rejected',
    title: 'Declined',
    empty: '',
    rows: admin.rejected.value,
  },
])
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Members</h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Anyone who signs in with Google lands here first. They can only open the app once you
        approve them.
      </p>
    </header>

    <BaseSkeletonList v-if="admin.pending.value" :rows="4" />

    <div
      v-else-if="admin.error.value"
      class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200"
    >
      {{ admin.error.value }}
    </div>

    <template v-else>
      <section
        v-if="admin.waiting.value.length > 0"
        class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200"
      >
        <strong class="font-semibold">
          {{ admin.waiting.value.length }}
          {{ admin.waiting.value.length === 1 ? 'person is' : 'people are' }} waiting
        </strong>
        for you to let them in.
      </section>

      <section v-for="section in sections" :key="section.key">
        <template v-if="section.rows.length > 0 || section.empty">
          <h2 class="section-title mb-3">
            {{ section.title }} <span class="text-slate-400">({{ section.rows.length }})</span>
          </h2>

          <ul v-if="section.rows.length > 0" class="space-y-2">
            <MemberRow
              v-for="profile in section.rows"
              :key="profile.id"
              :profile="profile"
              :manageable="admin.canManage(profile)"
              :saving="admin.savingId.value === profile.id"
              @approve="admin.approve"
              @decline="decline"
              @revoke="revoke"
            />
          </ul>

          <p
            v-else
            class="card-muted px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400"
          >
            {{ section.empty }}
          </p>
        </template>
      </section>

      <div v-if="admin.all.value.length === 0" class="card">
        <BaseEmptyState
          icon="👥"
          title="No accounts yet"
          description="Once someone signs in with Google, they will show up here for you to approve."
        />
      </div>
    </template>
  </div>
</template>
