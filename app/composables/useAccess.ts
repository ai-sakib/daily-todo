import type { AccessStatus, Profile } from '~/types'
import * as profiles from '~/services/profiles'
import { errorMessage } from '~/utils/todo'

/**
 * Cached per account, so switching users can never hand the new session the
 * old one's verdict. `failed` is separate from `profile: null` on purpose: a
 * network error must not read as "this account was refused".
 */
interface AccessState {
  userId: string | null
  profile: Profile | null
  failed: boolean
}

const EMPTY: AccessState = { userId: null, profile: null, failed: false }

/**
 * The signed-in user's standing with the app.
 *
 * A Google sign-up creates an account before anyone has decided whether it may
 * be here, so the session alone proves nothing — the `profiles` row is what
 * says the user is in. The global middleware waits on `ensureProfile()` before
 * letting any page render, and the result is shared through `useState` so the
 * lookup happens once per session (during SSR, if the page is server-rendered)
 * rather than on every navigation.
 */
export function useAccess() {
  const db = useSupabaseClient()
  const { userId, resolveUserId } = useAuth()

  const state = useState<AccessState>('access', () => ({ ...EMPTY }))
  const loading = useState('access-loading', () => false)

  const profile = computed(() => state.value.profile)
  const status = computed<AccessStatus | null>(() => state.value.profile?.status ?? null)
  const isApproved = computed(() => status.value === 'approved')
  const isRejected = computed(() => status.value === 'rejected')
  const isAdmin = computed(() => isApproved.value && state.value.profile?.is_admin === true)
  /** Waiting on a decision — including the case where the row is not there yet. */
  const isPending = computed(() => !isApproved.value && !isRejected.value)
  const lookupFailed = computed(() => state.value.failed)

  const isFresh = () => state.value.userId !== null && state.value.userId === userId.value

  /**
   * Loads the profile unless a good copy for this user is already in hand.
   *
   * Errors are swallowed into `failed` rather than thrown: the caller is route
   * middleware, and a rejected promise there turns a hiccup into an error page.
   * The user lands on /pending instead, which can explain itself and retry.
   */
  async function ensureProfile(options: { force?: boolean } = {}): Promise<Profile | null> {
    if (!options.force && isFresh() && !state.value.failed) return state.value.profile

    loading.value = true
    try {
      const id = await resolveUserId()
      state.value = { userId: id, profile: await profiles.getProfile(db, id), failed: false }
    } catch (err) {
      // Keep whatever we knew; only the flag changes, so a transient failure on
      // a later navigation does not evict a perfectly good verdict.
      state.value = { ...state.value, failed: true }
      if (import.meta.dev) console.error('Access lookup failed:', errorMessage(err, 'unknown'))
    } finally {
      loading.value = false
    }

    return state.value.profile
  }

  /** Forgets the cached verdict — used on sign-out. */
  function clear() {
    state.value = { ...EMPTY }
  }

  return {
    profile,
    status,
    isApproved,
    isPending,
    isRejected,
    isAdmin,
    lookupFailed,
    loading,
    ensureProfile,
    clear,
  }
}
