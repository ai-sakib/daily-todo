/**
 * Schema of the Supabase project backing this app.
 *
 * Hand-maintained to mirror the live tables — `@nuxtjs/supabase` picks this up
 * automatically (see the `supabase.types` default) so every query is typed.
 * Regenerate with:
 *   npx supabase gen types typescript --project-id <id> > app/types/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          status: Database['public']['Enums']['access_status']
          is_admin: boolean
          created_at: string
          decided_at: string | null
          decided_by: string | null
        }
        // Rows are created by the `on_auth_user_created` trigger, never by the
        // client — the Insert shape exists only to satisfy the client's generic.
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          status?: Database['public']['Enums']['access_status']
          is_admin?: boolean
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          status?: Database['public']['Enums']['access_status']
          is_admin?: boolean
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
        }
        Relationships: []
      }
      todo_items: {
        Row: {
          id: string
          user_id: string
          item_key: string
          item_name: string
          is_active: boolean
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          item_key: string
          item_name: string
          is_active?: boolean
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          item_key?: string
          item_name?: string
          is_active?: boolean
          display_order?: number
          created_at?: string
        }
        Relationships: []
      }
      daily_todos: {
        Row: {
          id: string
          user_id: string
          todo_date: string
          item_key: string
          item_name: string
          is_completed: boolean
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          todo_date: string
          item_key: string
          item_name: string
          is_completed?: boolean
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          todo_date?: string
          item_key?: string
          item_name?: string
          is_completed?: boolean
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_schedule_status: {
        Row: {
          user_id: string
          schedule_date: string
          is_initialized: boolean
        }
        Insert: {
          user_id: string
          schedule_date: string
          is_initialized?: boolean
        }
        Update: {
          user_id?: string
          schedule_date?: string
          is_initialized?: boolean
        }
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: {
      is_admin: { Args: Record<never, never>; Returns: boolean }
      is_approved: { Args: Record<never, never>; Returns: boolean }
    }
    Enums: {
      access_status: 'pending' | 'approved' | 'rejected'
    }
    CompositeTypes: Record<never, never>
  }
}
