export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      runtime_assignments: {
        Row: {
          created_at: string
          is_active: boolean
          label: string | null
          notes: string | null
          provisioned_at: string
          runtime_slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          is_active?: boolean
          label?: string | null
          notes?: string | null
          provisioned_at?: string
          runtime_slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          is_active?: boolean
          label?: string | null
          notes?: string | null
          provisioned_at?: string
          runtime_slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      task_events: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          kind: string
          message: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          kind: string
          message: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          kind?: string
          message?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          answer: string | null
          attempts: number
          claimed_at: string | null
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          idempotency_key: string | null
          is_example: boolean
          max_attempts: number
          needs_reconciliation: boolean
          outcome: string | null
          question: Json | null
          request: string
          result: string | null
          runtime_response_id: string | null
          started_at: string | null
          status: string
          updated_at: string
          usage: Json | null
          user_id: string
        }
        Insert: {
          answer?: string | null
          attempts?: number
          claimed_at?: string | null
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          idempotency_key?: string | null
          is_example?: boolean
          max_attempts?: number
          needs_reconciliation?: boolean
          outcome?: string | null
          question?: Json | null
          request: string
          result?: string | null
          runtime_response_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          usage?: Json | null
          user_id: string
        }
        Update: {
          answer?: string | null
          attempts?: number
          claimed_at?: string | null
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          idempotency_key?: string | null
          is_example?: boolean
          max_attempts?: number
          needs_reconciliation?: boolean
          outcome?: string | null
          question?: Json | null
          request?: string
          result?: string | null
          runtime_response_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          usage?: Json | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      answer_task: {
        Args: { p_answer: string; p_task_id: string }
        Returns: boolean
      }
      cancel_task: { Args: { p_task_id: string }; Returns: boolean }
      claim_next_task: {
        Args: never
        Returns: {
          answer: string | null
          attempts: number
          claimed_at: string | null
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          idempotency_key: string | null
          is_example: boolean
          max_attempts: number
          needs_reconciliation: boolean
          outcome: string | null
          question: Json | null
          request: string
          result: string | null
          runtime_response_id: string | null
          started_at: string | null
          status: string
          updated_at: string
          usage: Json | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_next_task_for_user: {
        Args: { p_user_id: string }
        Returns: {
          answer: string | null
          attempts: number
          claimed_at: string | null
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          idempotency_key: string | null
          is_example: boolean
          max_attempts: number
          needs_reconciliation: boolean
          outcome: string | null
          question: Json | null
          request: string
          result: string | null
          runtime_response_id: string | null
          started_at: string | null
          status: string
          updated_at: string
          usage: Json | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_task: {
        Args: { p_idempotency_key: string; p_request: string }
        Returns: {
          duplicate: boolean
          id: string
        }[]
      }
      recover_stale_tasks: { Args: { lease_seconds?: number }; Returns: number }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
