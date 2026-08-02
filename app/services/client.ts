import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

/**
 * The Supabase client, bound to this project's schema.
 *
 * Services take the client as an argument rather than calling the composable
 * themselves: that keeps them free of Nuxt context requirements (safe to call
 * after `await`) and trivially mockable in tests.
 */
export type Db = SupabaseClient<Database>

/** Unwraps a PostgREST response, throwing on error so callers can use try/catch. */
export function unwrap<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw result.error
  return result.data
}
