import type { AccessStatus, Profile } from '~/types'
import { unwrap, type Db } from './client'

const TABLE = 'profiles'

/**
 * The signed-in user's own profile.
 *
 * `maybeSingle` rather than `single`: the row is created by a trigger on
 * `auth.users`, and an account that predates the trigger (or one caught in the
 * gap before a backfill) has none. Callers treat "no row" as "not approved",
 * which is the safe reading.
 */
export async function getProfile(db: Db, userId: string): Promise<Profile | null> {
  const result = await db
    .from(TABLE)
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  return (unwrap(result) as Profile | null) ?? null
}

/**
 * Every account, newest first. Only admins get rows back — for anyone else RLS
 * narrows this to their own profile, so the admin screen is empty rather than
 * leaky if it is ever reached without the route guard.
 */
export async function listProfiles(db: Db): Promise<Profile[]> {
  const result = await db
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })

  return (unwrap(result) as Profile[]) ?? []
}

/** How many accounts are still waiting, for the badge on the admin link. */
export async function countPending(db: Db): Promise<number> {
  const result = await db
    .from(TABLE)
    .select('id')
    .eq('status', 'pending')

  return ((unwrap(result) as { id: string }[]) ?? []).length
}

/**
 * Records an access decision.
 *
 * `decided_by` is stamped from the client for the audit trail only; the actual
 * authority to write this row comes from the `admins update other profiles`
 * policy, which also refuses updates to the admin's own row.
 */
export async function setProfileStatus(
  db: Db,
  input: { id: string; status: AccessStatus; deciderId: string },
): Promise<void> {
  unwrap(
    await db
      .from(TABLE)
      .update({
        status: input.status,
        decided_at: new Date().toISOString(),
        decided_by: input.deciderId,
      })
      .eq('id', input.id),
  )
}
