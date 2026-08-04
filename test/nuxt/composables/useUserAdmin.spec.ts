import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { Profile } from '~/types'
import { profileName } from '~/composables/useUserAdmin'
import { FakeSupabase, makeProfile } from '../../helpers/fakeSupabase'

const mocks = vi.hoisted(() => ({ db: null as never, user: null as never }))

mockNuxtImport('useSupabaseClient', () => () => mocks.db)
mockNuxtImport('useSupabaseUser', () => () => mocks.user)

const ADMIN = 'admin-1'

let db: FakeSupabase

beforeEach(() => {
  db = new FakeSupabase()
  mocks.db = db.asDb() as never
  mocks.user = ref({ sub: ADMIN }) as never
  useToast().toasts.value = []
  useState('access-pending-count', () => 0).value = 0
})

const lastToast = () => useToast().toasts.value.at(-1)

const seed = () => {
  db.tables.profiles!.push(
    makeProfile({ id: ADMIN, status: 'approved', is_admin: true, full_name: 'Owner' }),
    makeProfile({ id: 'waiting-1', status: 'pending', full_name: 'Ada' }),
    makeProfile({ id: 'waiting-2', status: 'pending', full_name: 'Grace' }),
    makeProfile({ id: 'member-1', status: 'approved', full_name: 'Linus' }),
    makeProfile({ id: 'declined-1', status: 'rejected', full_name: 'Mallory' }),
  )
}

const find = (admin: ReturnType<typeof useUserAdmin>, id: string) =>
  admin.all.value.find(profile => profile.id === id)!

describe('load', () => {
  it('groups accounts by status', async () => {
    seed()
    const admin = useUserAdmin()
    await admin.load()

    expect(admin.waiting.value.map(p => p.id)).toEqual(['waiting-1', 'waiting-2'])
    expect(admin.approved.value.map(p => p.id)).toEqual([ADMIN, 'member-1'])
    expect(admin.rejected.value.map(p => p.id)).toEqual(['declined-1'])
    expect(admin.pending.value).toBe(false)
  })

  it('fills the badge count from the same query', async () => {
    seed()
    const admin = useUserAdmin()
    await admin.load()

    expect(admin.pendingCount.value).toBe(2)
  })

  it('surfaces a load failure', async () => {
    db.failNext({ message: 'offline' }, 'select')
    const admin = useUserAdmin()
    await admin.load()

    expect(admin.error.value).toBe('offline')
    expect(admin.all.value).toEqual([])
  })
})

describe('refreshPendingCount', () => {
  it('counts the waiting accounts without loading the list', async () => {
    seed()
    const admin = useUserAdmin()
    await admin.refreshPendingCount()

    expect(admin.pendingCount.value).toBe(2)
    expect(admin.all.value).toEqual([])
  })

  it('stays quiet when the count query fails', async () => {
    db.failNext({ message: 'offline' }, 'select')
    const admin = useUserAdmin()
    await admin.refreshPendingCount()

    expect(admin.pendingCount.value).toBe(0)
    expect(lastToast()).toBeUndefined()
  })
})

describe('approve', () => {
  it('moves the account into the approved group and writes the row', async () => {
    seed()
    const admin = useUserAdmin()
    await admin.load()

    await expect(admin.approve(find(admin, 'waiting-1'))).resolves.toBe(true)

    expect(admin.waiting.value.map(p => p.id)).toEqual(['waiting-2'])
    expect(db.rows('profiles').find(r => r.id === 'waiting-1')!.status).toBe('approved')
    expect(db.rows('profiles').find(r => r.id === 'waiting-1')!.decided_by).toBe(ADMIN)
    expect(lastToast()?.message).toBe('Ada can now use the app')
  })

  it('drops the badge count as the queue shrinks', async () => {
    seed()
    const admin = useUserAdmin()
    await admin.load()

    await admin.approve(find(admin, 'waiting-1'))

    expect(admin.pendingCount.value).toBe(1)
  })

  it('lets a previously declined account back in', async () => {
    seed()
    const admin = useUserAdmin()
    await admin.load()

    await admin.approve(find(admin, 'declined-1'))

    expect(admin.rejected.value).toEqual([])
    expect(admin.approved.value.map(p => p.id)).toContain('declined-1')
  })

  it('rolls back and warns when the write is refused', async () => {
    seed()
    const admin = useUserAdmin()
    await admin.load()
    db.failNext({ code: '42501', message: 'row-level security' }, 'update')

    await expect(admin.approve(find(admin, 'waiting-1'))).resolves.toBe(false)

    expect(find(admin, 'waiting-1').status).toBe('pending')
    expect(admin.pendingCount.value).toBe(2)
    expect(lastToast()?.kind).toBe('error')
  })

  it('does nothing when the status is already what was asked for', async () => {
    seed()
    const admin = useUserAdmin()
    await admin.load()

    await expect(admin.approve(find(admin, 'member-1'))).resolves.toBe(false)
    expect(db.countOps('profiles', 'update')).toBe(0)
  })
})

describe('decline', () => {
  it('records the rejection', async () => {
    seed()
    const admin = useUserAdmin()
    await admin.load()

    await admin.decline(find(admin, 'waiting-2'))

    expect(db.rows('profiles').find(r => r.id === 'waiting-2')!.status).toBe('rejected')
    expect(admin.rejected.value.map(p => p.id)).toContain('waiting-2')
    expect(lastToast()?.message).toBe('Declined Grace')
  })
})

describe('revoke', () => {
  it('sends an approved member back to the waiting list', async () => {
    seed()
    const admin = useUserAdmin()
    await admin.load()

    await admin.revoke(find(admin, 'member-1'))

    expect(db.rows('profiles').find(r => r.id === 'member-1')!.status).toBe('pending')
    expect(admin.pendingCount.value).toBe(3)
  })
})

describe('canManage', () => {
  it('refuses the admin their own row', async () => {
    // The RLS policy blocks self-edits so an admin cannot lock themselves out;
    // the UI hides the buttons rather than offering a doomed click.
    seed()
    const admin = useUserAdmin()
    await admin.load()

    expect(admin.canManage(find(admin, ADMIN))).toBe(false)
    expect(admin.canManage(find(admin, 'member-1'))).toBe(true)
  })
})

describe('profileName', () => {
  it('prefers the full name', () => {
    expect(profileName({ full_name: 'Ada Lovelace', email: 'ada@example.com' } as Profile))
      .toBe('Ada Lovelace')
  })

  it('falls back to the email when the name is missing or blank', () => {
    expect(profileName({ full_name: null, email: 'ada@example.com' } as Profile))
      .toBe('ada@example.com')
    expect(profileName({ full_name: '   ', email: 'ada@example.com' } as Profile))
      .toBe('ada@example.com')
  })
})
