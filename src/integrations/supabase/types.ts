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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      analytics_daily_stats: {
        Row: {
          ai_parsing_success_rate: number | null
          avg_session_duration_seconds: number | null
          date: string
          file_uploads: number | null
          pdf_downloads: number | null
          recipes_saved: number | null
          sourdough_to_yeast_count: number | null
          total_conversions: number | null
          total_sessions: number | null
          updated_at: string | null
          yeast_to_sourdough_count: number | null
        }
        Insert: {
          ai_parsing_success_rate?: number | null
          avg_session_duration_seconds?: number | null
          date: string
          file_uploads?: number | null
          pdf_downloads?: number | null
          recipes_saved?: number | null
          sourdough_to_yeast_count?: number | null
          total_conversions?: number | null
          total_sessions?: number | null
          updated_at?: string | null
          yeast_to_sourdough_count?: number | null
        }
        Update: {
          ai_parsing_success_rate?: number | null
          avg_session_duration_seconds?: number | null
          date?: string
          file_uploads?: number | null
          pdf_downloads?: number | null
          recipes_saved?: number | null
          sourdough_to_yeast_count?: number | null
          total_conversions?: number | null
          total_sessions?: number | null
          updated_at?: string | null
          yeast_to_sourdough_count?: number | null
        }
        Relationships: []
      }
      analytics_error_details: {
        Row: {
          context: Json | null
          created_at: string
          edge_function_logs: string | null
          error_code: string | null
          error_message: string
          error_severity: string
          error_type: string
          event_id: string | null
          id: string
          request_data: Json | null
          response_data: Json | null
          session_id: string | null
          stack_trace: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          edge_function_logs?: string | null
          error_code?: string | null
          error_message: string
          error_severity: string
          error_type: string
          event_id?: string | null
          id?: string
          request_data?: Json | null
          response_data?: Json | null
          session_id?: string | null
          stack_trace?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          edge_function_logs?: string | null
          error_code?: string | null
          error_message?: string
          error_severity?: string
          error_type?: string
          event_id?: string | null
          id?: string
          request_data?: Json | null
          response_data?: Json | null
          session_id?: string | null
          stack_trace?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_error_details_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "analytics_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_error_details_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          session_id: string
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          session_id: string
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          session_id?: string
        }
        Relationships: []
      }
      analytics_sessions: {
        Row: {
          conversion_completed: boolean | null
          conversion_direction: string | null
          ended_at: string | null
          events_count: number | null
          id: string
          page_views: number | null
          started_at: string | null
        }
        Insert: {
          conversion_completed?: boolean | null
          conversion_direction?: string | null
          ended_at?: string | null
          events_count?: number | null
          id?: string
          page_views?: number | null
          started_at?: string | null
        }
        Update: {
          conversion_completed?: boolean | null
          conversion_direction?: string | null
          ended_at?: string | null
          events_count?: number | null
          id?: string
          page_views?: number | null
          started_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
