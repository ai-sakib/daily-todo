import type { AccessStatus, Profile } from '~/types'
import * as profiles from '~/services/profiles'
import { errorMessage } from '~/utils/todo'

/** Best available human label for an account. */
export function profileName(profile: Profile): string {
  return profile.full_name?.trim() || profile.email
}

/**
 * The owner's view of who may use the app.
 *
 * Only reachable by an admin — the route guard turns everyone else away, and
 * RLS would return nothing but their own row even if they got here.
 */
export function useUserAdmin() {
  const db = useSupabaseClient()
  const { userId } = useAuth()
  const toast = useToast()

  const all = ref<Profile[]>([])
  const pending = ref(true)
  const savingId = ref<string | null>(null)
  const error = ref<string | null>(null)

  // Shared with the header badge, so approving someone updates the count
  // without a second round-trip.
  const pendingCount = useState('access-pending-count', () => 0)

  const byStatus = (status: AccessStatus) =>
    computed(() => all.value.filter(profile => profile.status === status))

  const waiting = byStatus('pending')
  const approved = byStatus('approved')
  const rejected = byStatus('rejected')

  /** An admin cannot decide their own access; the policy refuses it too. */
  function canManage(profile: Profile): boolean {
    return profile.id !== userId.value
  }

  async function load() {
    pending.value = true
    error.value = null
    try {
      all.value = await profiles.listProfiles(db)
      pendingCount.value = all.value.filter(profile => profile.status === 'pending').length
    } catch (err) {
      error.value = errorMessage(err, 'Could not load the member list.')
      all.value = []
    } finally {
      pending.value = false
    }
  }

  /** Refreshes just the badge count, for callers that never open the list. */
  async function refreshPendingCount() {
    try {
      pendingCount.value = await profiles.countPending(db)
    } catch {
      // A missing badge is not worth surfacing.
    }
  }

  function replace(id: string, patch: Partial<Profile>) {
    all.value = all.value.map(profile => (profile.id === id ? { ...profile, ...patch } : profile))
    pendingCount.value = all.value.filter(profile => profile.status === 'pending').length
  }

  async function setStatus(profile: Profile, status: AccessStatus, message: string) {
    if (profile.status === status) return false

    const snapshot = { status: profile.status, decided_at: profile.decided_at }
    replace(profile.id, { status, decided_at: new Date().toISOString() })
    savingId.value = profile.id

    try {
      await profiles.setProfileStatus(db, { id: profile.id, status, deciderId: userId.value ?? '' })
      toast.success(message)
      return true
    } catch (err) {
      replace(profile.id, snapshot)
      toast.error(errorMessage(err, 'Could not update that member.'))
      return false
    } finally {
      savingId.value = null
    }
  }

  const approve = (profile: Profile) =>
    setStatus(profile, 'approved', `${profileName(profile)} can now use the app`)

  const decline = (profile: Profile) =>
    setStatus(profile, 'rejected', `Declined ${profileName(profile)}`)

  /** Sends an approved member back to the waiting list. */
  const revoke = (profile: Profile) =>
    setStatus(profile, 'pending', `Revoked access for ${profileName(profile)}`)

  return {
    all,
    waiting,
    approved,
    rejected,
    pending,
    pendingCount,
    savingId,
    error,
    canManage,
    load,
    refreshPendingCount,
    approve,
    decline,
    revoke,
  }
}
