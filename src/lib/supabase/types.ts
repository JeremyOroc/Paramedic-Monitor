// Auto-generated types from Supabase schema.
// Regenerate with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID
// For now this is a manual approximation — regenerate after running migrations.

export type Database = {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string
          code: string
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          created_at?: string
        }
      }
      vitals_snapshots: {
        Row: {
          id: string
          session_id: string
          hr: number
          bp_sys: number
          bp_dia: number
          etco2: number
          spo2: number
          rhythm: string
          patient_mode: string
          joules: number
          shock_count: number
          cpr_active: boolean
          etco2_mode: boolean
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          hr?: number
          bp_sys?: number
          bp_dia?: number
          etco2?: number
          spo2?: number
          rhythm?: string
          patient_mode?: string
          joules?: number
          shock_count?: number
          cpr_active?: boolean
          etco2_mode?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['vitals_snapshots']['Insert']>
      }
      scenarios: {
        Row: {
          id: string
          session_id: string
          name: string
          timing_mode: string
          states: unknown
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          name: string
          timing_mode?: string
          states?: unknown
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['scenarios']['Insert']>
      }
    }
  }
}
