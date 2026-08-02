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
    Functions: Record<never, never>
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
