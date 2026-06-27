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
          status: 'waiting' | 'active' | 'ended'
          active_attempt_version: number
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          status?: 'waiting' | 'active' | 'ended'
          active_attempt_version?: number
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          status?: 'waiting' | 'active' | 'ended'
          active_attempt_version?: number
          expires_at?: string | null
          created_at?: string
        }
      }
      session_hosts: {
        Row: {
          id: string
          session_id: string
          token_hash: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          token_hash: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['session_hosts']['Insert']>
      }
      session_state: {
        Row: {
          session_id: string
          state: unknown
          version: number
          updated_at: string
        }
        Insert: {
          session_id: string
          state?: unknown
          version?: number
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['session_state']['Insert']>
      }
      participants: {
        Row: {
          id: string
          session_id: string
          nickname: string
          token_hash: string
          joined_at: string
          last_seen_at: string | null
        }
        Insert: {
          id?: string
          session_id: string
          nickname: string
          token_hash: string
          joined_at?: string
          last_seen_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['participants']['Insert']>
      }
      participant_attempts: {
        Row: {
          id: string
          session_id: string
          participant_id: string
          attempt_version: number
          started_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          session_id: string
          participant_id: string
          attempt_version: number
          started_at?: string
          completed_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['participant_attempts']['Insert']>
      }
      student_events: {
        Row: {
          id: string
          session_id: string
          participant_id: string
          attempt_version: number
          kind: string
          label: string
          payload: unknown
          occurred_at: string
        }
        Insert: {
          id?: string
          session_id: string
          participant_id: string
          attempt_version: number
          kind: string
          label: string
          payload?: unknown
          occurred_at?: string
        }
        Update: Partial<Database['public']['Tables']['student_events']['Insert']>
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
