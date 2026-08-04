import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as profiles from '~/services/profiles'
import { FakeSupabase, makeProfile } from '../../helpers/fakeSupabase'

let db: FakeSupabase

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-04T10:00:00.000Z'))
  db = new FakeSupabase()
})

afterEach(() => vi.useRealTimers())

describe('getProfile', () => {
  it('returns the row for the given account', async () => {
    db.tables.profiles!.push(
      makeProfile({ id: 'user-1', email: 'a@example.com', status: 'approved' }),
      makeProfile({ id: 'user-2', email: 'b@example.com' }),
    )

    const profile = await profiles.getProfile(db.asDb(), 'user-1')

    expect(profile?.email).toBe('a@example.com')
    expect(profile?.status).toBe('approved')
  })

  it('returns null when the account has no profile row', async () => {
    // An account created before the sign-up trigger existed. Callers read this
    // as "not approved" rather than crashing on a missing row.
    await expect(profiles.getProfile(db.asDb(), 'nobody')).resolves.toBeNull()
  })

  it('throws when the query fails', async () => {
    db.failNext({ message: 'offline' })
    await expect(profiles.getProfile(db.asDb(), 'user-1')).rejects.toMatchObject({
      message: 'offline',
    })
  })
})

describe('listProfiles', () => {
  it('returns everyone, newest first', async () => {
    db.tables.profiles!.push(
      makeProfile({ id: 'old', created_at: '2026-01-01T00:00:00.000Z' }),
      makeProfile({ id: 'new', created_at: '2026-08-01T00:00:00.000Z' }),
      makeProfile({ id: 'mid', created_at: '2026-04-01T00:00:00.000Z' }),
    )

    const rows = await profiles.listProfiles(db.asDb())

    expect(rows.map(row => row.id)).toEqual(['new', 'mid', 'old'])
  })

  it('is empty when there is nothing to show', async () => {
    await expect(profiles.listProfiles(db.asDb())).resolves.toEqual([])
  })
})

describe('countPending', () => {
  it('counts only the accounts still waiting', async () => {
    db.tables.profiles!.push(
      makeProfile({ status: 'pending' }),
      makeProfile({ status: 'pending' }),
      makeProfile({ status: 'approved' }),
      makeProfile({ status: 'rejected' }),
    )

    await expect(profiles.countPending(db.asDb())).resolves.toBe(2)
  })
})

describe('setProfileStatus', () => {
  it('records the decision and who made it', async () => {
    db.tables.profiles!.push(makeProfile({ id: 'user-2', status: 'pending' }))

    await profiles.setProfileStatus(db.asDb(), {
      id: 'user-2',
      status: 'approved',
      deciderId: 'admin-1',
    })

    const row = db.rows('profiles').find(entry => entry.id === 'user-2')!
    expect(row.status).toBe('approved')
    expect(row.decided_by).toBe('admin-1')
    expect(row.decided_at).toBe('2026-08-04T10:00:00.000Z')
  })

  it('touches only the targeted account', async () => {
    db.tables.profiles!.push(
      makeProfile({ id: 'user-2', status: 'pending' }),
      makeProfile({ id: 'user-3', status: 'pending' }),
    )

    await profiles.setProfileStatus(db.asDb(), {
      id: 'user-2',
      status: 'rejected',
      deciderId: 'admin-1',
    })

    expect(db.rows('profiles').find(entry => entry.id === 'user-3')!.status).toBe('pending')
  })

  it('throws when the update is refused', async () => {
    // What RLS does when an admin tries to change their own row.
    db.failNext({ code: '42501', message: 'new row violates row-level security policy' }, 'update')

    await expect(
      profiles.setProfileStatus(db.asDb(), { id: 'me', status: 'approved', deciderId: 'me' }),
    ).rejects.toMatchObject({ code: '42501' })
  })
})
