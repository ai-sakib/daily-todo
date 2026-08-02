const POST_LOGIN_KEY = 'daily-post-login-path'

/**
 * Thin wrapper over `@nuxtjs/supabase` auth so pages never talk to the raw
 * client for session concerns.
 */
export function useAuth() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  /**
   * `useSupabaseUser()` holds the decoded JWT payload, not a `User` row, so the
   * account id is the `sub` claim — there is no `id` property. The payload has
   * an `[key: string]: any` index signature, so reading the wrong key compiles
   * happily and only fails at runtime; go through this everywhere.
   */
  const userId = computed<string | null>(() => user.value?.sub ?? null)

  /**
   * The id, waiting on the network if the claims have not landed yet. The
   * client plugin fills `useSupabaseUser()` asynchronously (`page:start` and
   * `onAuthStateChange`), so a page that loads data on mount can otherwise race
   * it and conclude nobody is signed in.
   */
  async function resolveUserId(): Promise<string> {
    if (userId.value) return userId.value

    const { data } = await supabase.auth.getClaims()
    const sub = data?.claims?.sub
    if (!sub) throw new Error('You need to be signed in.')
    return sub
  }

  const displayName = computed(() => {
    const metadata = user.value?.user_metadata as { name?: string; full_name?: string } | undefined
    return metadata?.name || metadata?.full_name || user.value?.email || 'You'
  })

  const avatarUrl = computed(() => {
    const metadata = user.value?.user_metadata as { avatar_url?: string } | undefined
    return metadata?.avatar_url ?? null
  })

  const initials = computed(() => displayName.value.charAt(0).toUpperCase())

  /**
   * The post-login destination is stashed in sessionStorage rather than in the
   * `redirectTo` URL: Supabase matches that URL against its allow-list, and a
   * query string would have to be whitelisted separately.
   */
  async function signInWithGoogle(redirectPath = '/') {
    try {
      sessionStorage.setItem(POST_LOGIN_KEY, redirectPath)
    } catch {
      // Private browsing — we just land on the home page instead.
    }

    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  /** Reads and clears the destination saved before the OAuth round-trip. */
  function consumePostLoginPath(): string {
    try {
      const path = sessionStorage.getItem(POST_LOGIN_KEY)
      sessionStorage.removeItem(POST_LOGIN_KEY)
      return path?.startsWith('/') ? path : '/'
    } catch {
      return '/'
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (!error) await navigateTo('/login')
    return { error }
  }

  return {
    user,
    userId,
    resolveUserId,
    displayName,
    avatarUrl,
    initials,
    signInWithGoogle,
    consumePostLoginPath,
    signOut,
  }
}
