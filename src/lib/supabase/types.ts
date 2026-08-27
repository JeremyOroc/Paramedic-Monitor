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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      session_state_history: {
        Row: {
          id: string
          session_id: string
          attempt_version: number
          version: number
          state: unknown
          applied_at: string
        }
        Insert: {
          id?: string
          session_id: string
          attempt_version: number
          version: number
          state: unknown
          applied_at?: string
        }
        Update: Partial<Database['public']['Tables']['session_state_history']['Insert']>
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
          state_version: number | null
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
          state_version?: number | null
        }
        Update: Partial<Database['public']['Tables']['student_events']['Insert']>
        Relationships: []
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
        Relationships: []
      }
      scenario_folders: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['scenario_folders']['Insert']>
        Relationships: []
      }
      saved_scenarios: {
        Row: {
          id: string
          folder_id: string
          scenario_number: number
          title: string
          snapshot: unknown
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          folder_id: string
          scenario_number: number
          title: string
          snapshot: unknown
          position: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['saved_scenarios']['Insert']>
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: {
      create_saved_scenario: {
        Args: {
          folder_id: string
          requested_title: string
          scenario_snapshot: unknown
        }
        Returns: Database['public']['Tables']['saved_scenarios']['Row']
      }
      create_saved_scenario_with_auto_folder: {
        Args: {
          requested_title: string
          scenario_snapshot: unknown
        }
        Returns: Database['public']['Tables']['saved_scenarios']['Row']
      }
      move_saved_scenario: {
        Args: {
          scenario_to_move: string
          target_folder: string
        }
        Returns: Database['public']['Tables']['saved_scenarios']['Row']
      }
      reorder_saved_scenarios: {
        Args: {
          folder_to_reorder: string
          ordered_scenario_ids: string[]
        }
        Returns: Database['public']['Tables']['saved_scenarios']['Row'][]
      }
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
