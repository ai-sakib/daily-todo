<script setup lang="ts">
import type { Profile } from '~/types'
import { formatTimestampDate } from '~/utils/date'
import { profileName } from '~/composables/useUserAdmin'

const props = defineProps<{
  profile: Profile
  /** False for the admin's own row — the policy refuses self-edits anyway. */
  manageable: boolean
  saving: boolean
}>()

const emit = defineEmits<{
  approve: [Profile]
  decline: [Profile]
  revoke: [Profile]
}>()

const name = computed(() => profileName(props.profile))
const initial = computed(() => name.value.charAt(0).toUpperCase())

const badge = computed(() => {
  switch (props.profile.status) {
    case 'approved':
      return { label: 'Approved', class: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' }
    case 'rejected':
      return { label: 'Declined', class: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' }
    default:
      return { label: 'Pending', class: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' }
  }
})

const joined = computed(() => formatTimestampDate(props.profile.created_at))
</script>

<template>
  <li
    class="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-slate-300 dark:border-white/10 dark:bg-slate-900 dark:hover:border-white/20"
  >
    <img
      v-if="profile.avatar_url"
      :src="profile.avatar_url"
      :alt="name"
      class="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-slate-200 dark:ring-white/10"
    >
    <span
      v-else
      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white"
    >
      {{ initial }}
    </span>

    <div class="min-w-0 flex-1 basis-40">
      <p class="flex items-center gap-1.5 truncate text-sm font-semibold">
        {{ name }}
        <span
          v-if="profile.is_admin"
          class="chip bg-brand-500/10 text-brand-700 dark:text-brand-300"
        >Admin</span>
        <span v-if="!manageable" class="text-xs font-normal text-slate-400">(you)</span>
      </p>
      <p class="truncate text-xs text-slate-500 dark:text-slate-400">{{ profile.email }}</p>
    </div>

    <div class="shrink-0 text-right">
      <span class="chip" :class="badge.class">{{ badge.label }}</span>
      <p class="mt-1 hidden text-[11px] text-slate-400 sm:block dark:text-slate-500">
        Joined {{ joined }}
      </p>
    </div>

    <div v-if="manageable" class="flex shrink-0 items-center gap-1.5">
      <BaseSpinner v-if="saving" size="sm" class="text-brand-600 dark:text-brand-400" />

      <template v-else-if="profile.status === 'pending'">
        <button type="button" class="btn btn-sm btn-primary" @click="emit('approve', profile)">
          Approve
        </button>
        <button type="button" class="btn btn-sm btn-secondary" @click="emit('decline', profile)">
          Decline
        </button>
      </template>

      <template v-else-if="profile.status === 'approved'">
        <button type="button" class="btn btn-sm btn-secondary" @click="emit('revoke', profile)">
          Revoke
        </button>
      </template>

      <template v-else>
        <button type="button" class="btn btn-sm btn-primary" @click="emit('approve', profile)">
          Approve
        </button>
      </template>
    </div>
  </li>
</template>
