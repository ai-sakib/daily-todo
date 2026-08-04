import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { FakeSupabase, makeProfile } from '../../helpers/fakeSupabase'

const mocks = vi.hoisted(() => ({ db: null as never, user: null as never }))

mockNuxtImport('useSupabaseClient', () => () => mocks.db)
mockNuxtImport('useSupabaseUser', () => () => mocks.user)

const USER = 'user-1'

let db: FakeSupabase

/** Resets the shared `useState` caches between tests. */
function resetState() {
  useAccess().clear()
  useState('access-loading', () => false).value = false
}

beforeEach(() => {
  db = new FakeSupabase()
  mocks.db = db.asDb() as never
  mocks.user = ref({ sub: USER }) as never
  resetState()
})

describe('ensureProfile', () => {
  it('reports an approved account', async () => {
    db.tables.profiles!.push(makeProfile({ id: USER, status: 'approved' }))

    const access = useAccess()
    await access.ensureProfile()

    expect(access.status.value).toBe('approved')
    expect(access.isApproved.value).toBe(true)
    expect(access.isPending.value).toBe(false)
    expect(access.isAdmin.value).toBe(false)
  })

  it('reports a pending account', async () => {
    db.tables.profiles!.push(makeProfile({ id: USER, status: 'pending' }))

    const access = useAccess()
    await access.ensureProfile()

    expect(access.isPending.value).toBe(true)
    expect(access.isApproved.value).toBe(false)
    expect(access.isRejected.value).toBe(false)
  })

  it('reports a rejected account separately from a pending one', async () => {
    db.tables.profiles!.push(makeProfile({ id: USER, status: 'rejected' }))

    const access = useAccess()
    await access.ensureProfile()

    expect(access.isRejected.value).toBe(true)
    expect(access.isPending.value).toBe(false)
  })

  it('treats a missing profile row as not approved', async () => {
    const access = useAccess()
    await access.ensureProfile()

    expect(access.profile.value).toBeNull()
    expect(access.isApproved.value).toBe(false)
    expect(access.isPending.value).toBe(true)
  })

  it('is admin only when approved as well as flagged', async () => {
    db.tables.profiles!.push(makeProfile({ id: USER, status: 'pending', is_admin: true }))

    const access = useAccess()
    await access.ensureProfile()

    // A demoted-but-still-flagged row must not open the admin screen.
    expect(access.isAdmin.value).toBe(false)
  })

  it('recognises the approved admin', async () => {
    db.tables.profiles!.push(makeProfile({ id: USER, status: 'approved', is_admin: true }))

    const access = useAccess()
    await access.ensureProfile()

    expect(access.isAdmin.value).toBe(true)
  })

  it('caches the verdict so repeat navigations cost nothing', async () => {
    db.tables.profiles!.push(makeProfile({ id: USER, status: 'approved' }))

    const access = useAccess()
    await access.ensureProfile()
    await access.ensureProfile()
    await access.ensureProfile()

    expect(db.countOps('profiles', 'select')).toBe(1)
  })

  it('re-reads when forced', async () => {
    db.tables.profiles!.push(makeProfile({ id: USER, status: 'pending' }))

    const access = useAccess()
    await access.ensureProfile()

    db.rows('profiles')[0]!.status = 'approved'
    await access.ensureProfile({ force: true })

    expect(access.isApproved.value).toBe(true)
    expect(db.countOps('profiles', 'select')).toBe(2)
  })

  it('re-reads when a different account signs in', async () => {
    db.tables.profiles!.push(
      makeProfile({ id: USER, status: 'approved' }),
      makeProfile({ id: 'user-2', status: 'pending' }),
    )

    const access = useAccess()
    await access.ensureProfile()
    expect(access.isApproved.value).toBe(true)

    // Same tab, new session — the previous verdict must not carry over.
    mocks.user = ref({ sub: 'user-2' }) as never
    await useAccess().ensureProfile()

    expect(useAccess().isApproved.value).toBe(false)
  })

  it('flags a failed lookup instead of throwing', async () => {
    // The caller is route middleware; a rejected promise there is an error page.
    db.failNext({ message: 'offline' })

    const access = useAccess()
    await expect(access.ensureProfile()).resolves.toBeNull()

    expect(access.lookupFailed.value).toBe(true)
    expect(access.isApproved.value).toBe(false)
  })

  it('keeps the last known verdict when a later lookup fails', async () => {
    db.tables.profiles!.push(makeProfile({ id: USER, status: 'approved' }))

    const access = useAccess()
    await access.ensureProfile()

    db.failNext({ message: 'offline' })
    await access.ensureProfile({ force: true })

    expect(access.lookupFailed.value).toBe(true)
    expect(access.profile.value?.status).toBe('approved')
  })

  it('retries after a failure rather than caching it', async () => {
    db.failNext({ message: 'offline' })
    const access = useAccess()
    await access.ensureProfile()

    db.tables.profiles!.push(makeProfile({ id: USER, status: 'approved' }))
    await access.ensureProfile()

    expect(access.isApproved.value).toBe(true)
    expect(access.lookupFailed.value).toBe(false)
  })
})

describe('clear', () => {
  it('forgets the cached verdict', async () => {
    db.tables.profiles!.push(makeProfile({ id: USER, status: 'approved' }))

    const access = useAccess()
    await access.ensureProfile()
    access.clear()

    expect(access.profile.value).toBeNull()
    expect(access.isApproved.value).toBe(false)
  })
})
