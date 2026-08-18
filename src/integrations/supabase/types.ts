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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      artists: {
        Row: {
          company_id: string | null
          contact: string
          created_at: string
          id: string
          musical_style: string
          name: string
          notes: string
          rider_file_name: string | null
          rider_file_url: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          contact?: string
          created_at?: string
          id?: string
          musical_style?: string
          name: string
          notes?: string
          rider_file_name?: string | null
          rider_file_url?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          contact?: string
          created_at?: string
          id?: string
          musical_style?: string
          name?: string
          notes?: string
          rider_file_name?: string | null
          rider_file_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artists_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          name: string
          state: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          name: string
          state: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          name?: string
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      company_subscriptions: {
        Row: {
          company_id: string
          created_at: string
          expires_at: string | null
          id: string
          notes: string
          plan_id: string
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string
          plan_id: string
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string
          plan_id?: string
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      event_staff: {
        Row: {
          created_at: string
          event_id: string
          id: string
          staff_member_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          staff_member_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          staff_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          artist_id: string
          city_id: string
          company_id: string | null
          contratante_cidade: string | null
          contratante_nome: string | null
          contratante_telefone: string | null
          created_at: string
          date: string
          departure_date: string | null
          departure_time: string
          id: string
          name: string
          notes: string
          rider_id: string | null
          setup_time: string
          show_time: string
          staff_notes: string
          status: string
          updated_at: string
          venue: string
        }
        Insert: {
          artist_id: string
          city_id: string
          company_id?: string | null
          contratante_cidade?: string | null
          contratante_nome?: string | null
          contratante_telefone?: string | null
          created_at?: string
          date: string
          departure_date?: string | null
          departure_time?: string
          id?: string
          name: string
          notes?: string
          rider_id?: string | null
          setup_time?: string
          show_time?: string
          staff_notes?: string
          status?: string
          updated_at?: string
          venue?: string
        }
        Update: {
          artist_id?: string
          city_id?: string
          company_id?: string | null
          contratante_cidade?: string | null
          contratante_nome?: string | null
          contratante_telefone?: string | null
          created_at?: string
          date?: string
          departure_date?: string | null
          departure_time?: string
          id?: string
          name?: string
          notes?: string
          rider_id?: string | null
          setup_time?: string
          show_time?: string
          staff_notes?: string
          status?: string
          updated_at?: string
          venue?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "technical_riders"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_deliveries: {
        Row: {
          company_id: string | null
          created_at: string
          device_id: string | null
          error: string
          id: string
          notification_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          device_id?: string | null
          error?: string
          id?: string
          notification_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          device_id?: string | null
          error?: string
          id?: string
          notification_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "user_push_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          company_id: string | null
          created_at: string
          event_assignment_added: boolean
          event_assignment_removed: boolean
          event_cancelled: boolean
          event_created: boolean
          event_date_changed: boolean
          event_location_changed: boolean
          event_time_changed: boolean
          event_updated: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          event_assignment_added?: boolean
          event_assignment_removed?: boolean
          event_cancelled?: boolean
          event_created?: boolean
          event_date_changed?: boolean
          event_location_changed?: boolean
          event_time_changed?: boolean
          event_updated?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          event_assignment_added?: boolean
          event_assignment_removed?: boolean
          event_cancelled?: boolean
          event_created?: boolean
          event_date_changed?: boolean
          event_location_changed?: boolean
          event_time_changed?: boolean
          event_updated?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          company_id: string | null
          created_at: string
          dedupe_key: string | null
          event_id: string | null
          id: string
          is_read: boolean
          message: string
          metadata: Json
          read_at: string | null
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          dedupe_key?: string | null
          event_id?: string | null
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          dedupe_key?: string | null
          event_id?: string | null
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_submissions: {
        Row: {
          company_id: string
          created_at: string
          id: string
          notes: string
          receipt_file_name: string | null
          receipt_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string
          subscription_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          notes?: string
          receipt_file_name?: string | null
          receipt_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by: string
          subscription_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          notes?: string
          receipt_file_name?: string | null
          receipt_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_submissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_submissions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "company_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      pix_settings: {
        Row: {
          bank: string
          city: string
          id: string
          key_type: string
          pix_key: string
          receiver_name: string
          updated_at: string
        }
        Insert: {
          bank?: string
          city?: string
          id?: string
          key_type?: string
          pix_key?: string
          receiver_name?: string
          updated_at?: string
        }
        Update: {
          bank?: string
          city?: string
          id?: string
          key_type?: string
          pix_key?: string
          receiver_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      plan_change_requests: {
        Row: {
          company_id: string
          created_at: string
          current_plan_id: string | null
          id: string
          notes: string
          requested_by: string
          requested_plan_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          current_plan_id?: string | null
          id?: string
          notes?: string
          requested_by: string
          requested_plan_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          current_plan_id?: string | null
          id?: string
          notes?: string
          requested_by?: string
          requested_plan_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_change_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_change_requests_current_plan_id_fkey"
            columns: ["current_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_change_requests_requested_plan_id_fkey"
            columns: ["requested_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          description: string
          duration_days: number | null
          id: string
          is_active: boolean
          name: string
          price: number
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          duration_days?: number | null
          id?: string
          is_active?: boolean
          name: string
          price?: number
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          duration_days?: number | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          email: string
          id: string
          name: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email?: string
          id: string
          name?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          name: string
          notes: string
          phone: string
          role: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string
          phone?: string
          role?: string
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string
          phone?: string
          role?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          id: string
          platform_logo_url: string | null
          platform_name: string
          updated_at: string
        }
        Insert: {
          id?: string
          platform_logo_url?: string | null
          platform_name?: string
          updated_at?: string
        }
        Update: {
          id?: string
          platform_logo_url?: string | null
          platform_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      technical_riders: {
        Row: {
          artist_id: string | null
          company_id: string | null
          created_at: string
          equipment: string
          id: string
          microphones: string
          monitors: string
          name: string
          notes: string
          rider_file_name: string | null
          rider_file_url: string | null
          sound_system: string
          updated_at: string
        }
        Insert: {
          artist_id?: string | null
          company_id?: string | null
          created_at?: string
          equipment?: string
          id?: string
          microphones?: string
          monitors?: string
          name: string
          notes?: string
          rider_file_name?: string | null
          rider_file_url?: string | null
          sound_system?: string
          updated_at?: string
        }
        Update: {
          artist_id?: string | null
          company_id?: string | null
          created_at?: string
          equipment?: string
          id?: string
          microphones?: string
          monitors?: string
          name?: string
          notes?: string
          rider_file_name?: string | null
          rider_file_url?: string | null
          sound_system?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "technical_riders_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_riders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_push_devices: {
        Row: {
          auth: string
          company_id: string | null
          created_at: string
          device_name: string
          enabled: boolean
          endpoint: string
          id: string
          last_seen_at: string
          p256dh: string
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          company_id?: string | null
          created_at?: string
          device_name?: string
          enabled?: boolean
          endpoint: string
          id?: string
          last_seen_at?: string
          p256dh: string
          platform?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          company_id?: string | null
          created_at?: string
          device_name?: string
          enabled?: boolean
          endpoint?: string
          id?: string
          last_seen_at?: string
          p256dh?: string
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_push_devices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "admin_master" | "company_admin"
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
    Enums: {
      app_role: ["admin", "user", "admin_master", "company_admin"],
    },
  },
} as const
