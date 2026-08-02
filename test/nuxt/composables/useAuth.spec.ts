import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const mocks = vi.hoisted(() => ({
  user: null as never,
  navigateTo: vi.fn(),
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
  getClaims: vi.fn(),
}))

mockNuxtImport('useSupabaseUser', () => () => mocks.user)
mockNuxtImport('navigateTo', () => mocks.navigateTo)
mockNuxtImport('useSupabaseClient', () => () => ({
  auth: {
    signInWithOAuth: mocks.signInWithOAuth,
    signOut: mocks.signOut,
    getClaims: mocks.getClaims,
  },
}))

const claims = (overrides: Record<string, unknown> = {}) => ({ sub: 'user-1', ...overrides })

beforeEach(() => {
  vi.clearAllMocks()
  mocks.user = ref(claims()) as never
  mocks.signInWithOAuth.mockResolvedValue({ data: null, error: null })
  mocks.signOut.mockResolvedValue({ error: null })
  mocks.getClaims.mockResolvedValue({ data: { claims: claims() }, error: null })
  sessionStorage.clear()
})

describe('userId', () => {
  it('reads the id from the `sub` claim', () => {
    // Regression guard: useSupabaseUser() returns a decoded JWT, not a User
    // row. There is no `id` property, and the payload's index signature means
    // reading the wrong key compiles fine and silently yields undefined.
    expect(useAuth().userId.value).toBe('user-1')
  })

  it('is null when signed out', () => {
    mocks.user = ref(null) as never
    expect(useAuth().userId.value).toBeNull()
  })

  it('tracks a session arriving after setup', async () => {
    const user = ref(null)
    mocks.user = user as never
    const { userId } = useAuth()

    expect(userId.value).toBeNull()
    user.value = claims() as never
    expect(userId.value).toBe('user-1')
  })
})

describe('resolveUserId', () => {
  it('uses the reactive claims without a network call', async () => {
    await expect(useAuth().resolveUserId()).resolves.toBe('user-1')
    expect(mocks.getClaims).not.toHaveBeenCalled()
  })

  it('falls back to the network before the claims land', async () => {
    mocks.user = ref(null) as never

    await expect(useAuth().resolveUserId()).resolves.toBe('user-1')
    expect(mocks.getClaims).toHaveBeenCalledTimes(1)
  })

  it('throws when there is genuinely no session', async () => {
    mocks.user = ref(null) as never
    mocks.getClaims.mockResolvedValue({ data: null, error: null })

    await expect(useAuth().resolveUserId()).rejects.toThrow('You need to be signed in.')
  })

  it('throws when the claims come back without a subject', async () => {
    mocks.user = ref(null) as never
    mocks.getClaims.mockResolvedValue({ data: { claims: {} }, error: null })

    await expect(useAuth().resolveUserId()).rejects.toThrow('You need to be signed in.')
  })
})

describe('profile', () => {
  it('prefers the metadata name', () => {
    mocks.user = ref(claims({ user_metadata: { name: 'Ada Lovelace' }, email: 'ada@example.com' })) as never
    expect(useAuth().displayName.value).toBe('Ada Lovelace')
  })

  it('falls back to full_name, then email, then a generic label', () => {
    mocks.user = ref(claims({ user_metadata: { full_name: 'Ada L' } })) as never
    expect(useAuth().displayName.value).toBe('Ada L')

    mocks.user = ref(claims({ email: 'ada@example.com' })) as never
    expect(useAuth().displayName.value).toBe('ada@example.com')

    mocks.user = ref(claims()) as never
    expect(useAuth().displayName.value).toBe('You')
  })

  it('exposes the avatar when present, otherwise null', () => {
    mocks.user = ref(claims({ user_metadata: { avatar_url: 'https://img/a.png' } })) as never
    expect(useAuth().avatarUrl.value).toBe('https://img/a.png')

    mocks.user = ref(claims()) as never
    expect(useAuth().avatarUrl.value).toBeNull()
  })

  it('derives an uppercase initial', () => {
    mocks.user = ref(claims({ user_metadata: { name: 'ada' } })) as never
    expect(useAuth().initials.value).toBe('A')
  })
})

describe('signInWithGoogle', () => {
  it('sends a clean callback URL with no query string', async () => {
    // Supabase matches redirectTo against its allow-list; a query string would
    // have to be whitelisted separately, so the destination goes to storage.
    await useAuth().signInWithGoogle('/history')

    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  })

  it('stashes the destination for after the round-trip', async () => {
    await useAuth().signInWithGoogle('/history')
    expect(useAuth().consumePostLoginPath()).toBe('/history')
  })

  it('defaults the destination to the home page', async () => {
    await useAuth().signInWithGoogle()
    expect(useAuth().consumePostLoginPath()).toBe('/')
  })
})

describe('consumePostLoginPath', () => {
  it('clears the stored path so a later visit does not reuse it', () => {
    sessionStorage.setItem('daily-post-login-path', '/plan')
    const { consumePostLoginPath } = useAuth()

    expect(consumePostLoginPath()).toBe('/plan')
    expect(consumePostLoginPath()).toBe('/')
  })

  it('returns the home page when nothing was stored', () => {
    expect(useAuth().consumePostLoginPath()).toBe('/')
  })

  it('rejects an absolute URL — an open-redirect would be a real hole', () => {
    sessionStorage.setItem('daily-post-login-path', 'https://evil.example.com')
    expect(useAuth().consumePostLoginPath()).toBe('/')
  })

  it('rejects a protocol-relative URL', () => {
    sessionStorage.setItem('daily-post-login-path', '//evil.example.com')
    expect(useAuth().consumePostLoginPath()).toBe('/')
  })
})

describe('signOut', () => {
  it('returns to the login page on success', async () => {
    await useAuth().signOut()
    expect(mocks.navigateTo).toHaveBeenCalledWith('/login')
  })

  it('stays put and reports the failure', async () => {
    const error = new Error('network down')
    mocks.signOut.mockResolvedValue({ error })

    await expect(useAuth().signOut()).resolves.toEqual({ error })
    expect(mocks.navigateTo).not.toHaveBeenCalled()
  })
})
