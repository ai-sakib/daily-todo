import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { RouteLocationNormalized } from 'vue-router'
import middleware from '~/middleware/auth.global'

const mocks = vi.hoisted(() => ({ user: null as never, navigateTo: vi.fn() }))

mockNuxtImport('useSupabaseUser', () => () => mocks.user)
mockNuxtImport('navigateTo', () => mocks.navigateTo)

const route = (path: string, fullPath = path) =>
  ({ path, fullPath }) as RouteLocationNormalized

const run = (path: string, fullPath?: string) =>
  middleware(route(path, fullPath), route('/from')) as unknown

const signedIn = () => {
  mocks.user = ref({ sub: 'user-1' }) as never
}
const signedOut = () => {
  mocks.user = ref(null) as never
}

beforeEach(() => {
  mocks.navigateTo.mockReset()
  mocks.navigateTo.mockImplementation((target: unknown) => target)
})

describe('signed out', () => {
  beforeEach(signedOut)

  it('sends a protected route to the login page', () => {
    run('/')
    expect(mocks.navigateTo).toHaveBeenCalledWith({ path: '/login', query: {} })
  })

  it('remembers where the user was heading', () => {
    run('/history')
    expect(mocks.navigateTo).toHaveBeenCalledWith({
      path: '/login',
      query: { redirect: '/history' },
    })
  })

  it('preserves query strings in the remembered destination', () => {
    run('/plan', '/plan?tab=routine')
    expect(mocks.navigateTo).toHaveBeenCalledWith({
      path: '/login',
      query: { redirect: '/plan?tab=routine' },
    })
  })

  it('does not add a redirect back to the home page', () => {
    // "/" is where login lands anyway; a redirect param would be noise.
    run('/')
    expect(mocks.navigateTo).toHaveBeenCalledWith({ path: '/login', query: {} })
  })

  it('lets the login page through', () => {
    run('/login')
    expect(mocks.navigateTo).not.toHaveBeenCalled()
  })

  it('lets the OAuth callback through', () => {
    // Blocking this would break sign-in: the session does not exist yet.
    run('/auth/callback')
    expect(mocks.navigateTo).not.toHaveBeenCalled()
  })
})

describe('signed in', () => {
  beforeEach(signedIn)

  it('allows protected routes', () => {
    run('/history')
    expect(mocks.navigateTo).not.toHaveBeenCalled()
  })

  it('bounces the login page to the app', () => {
    run('/login')
    expect(mocks.navigateTo).toHaveBeenCalledWith('/')
  })

  it('still allows the callback to finish its redirect', () => {
    run('/auth/callback')
    expect(mocks.navigateTo).not.toHaveBeenCalled()
  })
})
