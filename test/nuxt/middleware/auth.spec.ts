import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { RouteLocationNormalized } from 'vue-router'
import type { AccessStatus, Profile } from '~/types'
import middleware from '~/middleware/auth.global'

const mocks = vi.hoisted(() => ({
  user: null as never,
  navigateTo: vi.fn(),
  ensureProfile: vi.fn(),
}))

mockNuxtImport('useSupabaseUser', () => () => mocks.user)
mockNuxtImport('navigateTo', () => mocks.navigateTo)
mockNuxtImport('useAccess', () => () => ({ ensureProfile: mocks.ensureProfile }))

const route = (path: string, fullPath = path) =>
  ({ path, fullPath }) as RouteLocationNormalized

const run = (path: string, fullPath?: string) =>
  middleware(route(path, fullPath), route('/from')) as Promise<unknown>

const signedIn = () => {
  mocks.user = ref({ sub: 'user-1' }) as never
}
const signedOut = () => {
  mocks.user = ref(null) as never
}

/** What `useAccess().ensureProfile()` hands back for the next navigation. */
const profile = (status: AccessStatus, isAdmin = false) => {
  mocks.ensureProfile.mockResolvedValue({ status, is_admin: isAdmin } as Profile)
}
const noProfile = () => mocks.ensureProfile.mockResolvedValue(null)

beforeEach(() => {
  mocks.navigateTo.mockReset()
  mocks.navigateTo.mockImplementation((target: unknown) => target)
  mocks.ensureProfile.mockReset()
  profile('approved')
})

describe('signed out', () => {
  beforeEach(signedOut)

  it('sends a protected route to the login page', async () => {
    await run('/')
    expect(mocks.navigateTo).toHaveBeenCalledWith({ path: '/login', query: {} })
  })

  it('remembers where the user was heading', async () => {
    await run('/history')
    expect(mocks.navigateTo).toHaveBeenCalledWith({
      path: '/login',
      query: { redirect: '/history' },
    })
  })

  it('preserves query strings in the remembered destination', async () => {
    await run('/plan', '/plan?tab=routine')
    expect(mocks.navigateTo).toHaveBeenCalledWith({
      path: '/login',
      query: { redirect: '/plan?tab=routine' },
    })
  })

  it('does not add a redirect back to the home page', async () => {
    // "/" is where login lands anyway; a redirect param would be noise.
    await run('/')
    expect(mocks.navigateTo).toHaveBeenCalledWith({ path: '/login', query: {} })
  })

  it('lets the login page through', async () => {
    await run('/login')
    expect(mocks.navigateTo).not.toHaveBeenCalled()
  })

  it('lets the OAuth callback through', async () => {
    // Blocking this would break sign-in: the session does not exist yet.
    await run('/auth/callback')
    expect(mocks.navigateTo).not.toHaveBeenCalled()
  })

  it('never asks the database about an account that is not signed in', async () => {
    await run('/')
    expect(mocks.ensureProfile).not.toHaveBeenCalled()
  })
})

describe('signed in and approved', () => {
  beforeEach(() => {
    signedIn()
    profile('approved')
  })

  it('allows protected routes', async () => {
    await run('/history')
    expect(mocks.navigateTo).not.toHaveBeenCalled()
  })

  it('bounces the login page to the app', async () => {
    await run('/login')
    expect(mocks.navigateTo).toHaveBeenCalledWith('/')
  })

  it('still allows the callback to finish its redirect', async () => {
    await run('/auth/callback')
    expect(mocks.navigateTo).not.toHaveBeenCalled()
  })

  it('sends the waiting screen back to the app', async () => {
    await run('/pending')
    expect(mocks.navigateTo).toHaveBeenCalledWith('/')
  })

  it('keeps a non-admin out of the members screen', async () => {
    await run('/admin')
    expect(mocks.navigateTo).toHaveBeenCalledWith('/')
  })

  it('lets an admin into the members screen', async () => {
    profile('approved', true)
    await run('/admin')
    expect(mocks.navigateTo).not.toHaveBeenCalled()
  })

  it('guards nested admin routes too', async () => {
    await run('/admin/anything')
    expect(mocks.navigateTo).toHaveBeenCalledWith('/')
  })

  it('does not treat a lookalike path as the admin area', async () => {
    await run('/administration')
    expect(mocks.navigateTo).not.toHaveBeenCalled()
  })
})

describe('signed in but not approved', () => {
  beforeEach(signedIn)

  it('holds a pending account on the waiting screen', async () => {
    profile('pending')
    await run('/')
    expect(mocks.navigateTo).toHaveBeenCalledWith('/pending')
  })

  it('holds a rejected account on the waiting screen', async () => {
    profile('rejected')
    await run('/history')
    expect(mocks.navigateTo).toHaveBeenCalledWith('/pending')
  })

  it('treats a missing profile row as not approved', async () => {
    noProfile()
    await run('/')
    expect(mocks.navigateTo).toHaveBeenCalledWith('/pending')
  })

  it('lets the waiting screen itself render', async () => {
    // Otherwise the redirect loops forever.
    profile('pending')
    await run('/pending')
    expect(mocks.navigateTo).not.toHaveBeenCalled()
  })

  it('keeps a pending account out of the admin area', async () => {
    // Even a flagged admin waits: approval comes first.
    profile('pending', true)
    await run('/admin')
    expect(mocks.navigateTo).toHaveBeenCalledWith('/pending')
  })

  it('lets them reach the login page to sign out', async () => {
    profile('pending')
    await run('/login')
    expect(mocks.navigateTo).toHaveBeenCalledWith('/')
  })
})
