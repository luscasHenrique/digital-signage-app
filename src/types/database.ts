// Gerado por `npm run db:types` (supabase gen types). Não edite à mão.
export type Json = string | number | boolean | null | {
  [key: string]: Json | undefined;
} | Json[];
export type Database = {
  "public": {
    Tables: {
      "ad_play_stats": {
        Row: {
          "ad_duration_seconds": number | null;
          "ad_title": string | null;
          "advertisement_id": string;
          "company_id": string;
          "day": string;
          "plays": number;
        };
        ComputedFields: never;
        Insert: {
          "ad_duration_seconds"?: number | null;
          "ad_title"?: string | null;
          "advertisement_id": string;
          "company_id": string;
          "day": string;
          "plays"?: number;
        };
        Update: {
          "ad_duration_seconds"?: number | null;
          "ad_title"?: string | null;
          "advertisement_id"?: string;
          "company_id"?: string;
          "day"?: string;
          "plays"?: number;
        };
        Relationships: [
          {
            foreignKeyName: "ad_play_stats_company_id_fkey";
            columns: [
              "company_id"
            ];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: [
              "id"
            ];
          }
        ];
      };
      "advertisements": {
        Row: {
          "content_url": string;
          "created_at": string | null;
          "created_by": string | null;
          "daily_end": string | null;
          "daily_start": string | null;
          "description": string | null;
          "duration_seconds": number;
          "end_date": string;
          "id": string;
          "last_edited_by": string | null;
          "overlay_bg_color": string | null;
          "overlay_position": string | null;
          "overlay_text": string | null;
          "overlay_text_color": string | null;
          "position": number;
          "start_date": string;
          "status": string;
          "thumbnail_url": string | null;
          "title": string;
          "type": string;
          "updated_at": string | null;
          "weekdays": (number)[] | null;
        };
        ComputedFields: never;
        Insert: {
          "content_url": string;
          "created_at"?: string | null;
          "created_by"?: string | null;
          "daily_end"?: string | null;
          "daily_start"?: string | null;
          "description"?: string | null;
          "duration_seconds"?: number;
          "end_date": string;
          "id"?: string;
          "last_edited_by"?: string | null;
          "overlay_bg_color"?: string | null;
          "overlay_position"?: string | null;
          "overlay_text"?: string | null;
          "overlay_text_color"?: string | null;
          "position"?: number;
          "start_date": string;
          "status"?: string;
          "thumbnail_url"?: string | null;
          "title": string;
          "type": string;
          "updated_at"?: string | null;
          "weekdays"?: (number)[] | null;
        };
        Update: {
          "content_url"?: string;
          "created_at"?: string | null;
          "created_by"?: string | null;
          "daily_end"?: string | null;
          "daily_start"?: string | null;
          "description"?: string | null;
          "duration_seconds"?: number;
          "end_date"?: string;
          "id"?: string;
          "last_edited_by"?: string | null;
          "overlay_bg_color"?: string | null;
          "overlay_position"?: string | null;
          "overlay_text"?: string | null;
          "overlay_text_color"?: string | null;
          "position"?: number;
          "start_date"?: string;
          "status"?: string;
          "thumbnail_url"?: string | null;
          "title"?: string;
          "type"?: string;
          "updated_at"?: string | null;
          "weekdays"?: (number)[] | null;
        };
        Relationships: [
        ];
      };
      "advertisements_companies": {
        Row: {
          "advertisement_id": string;
          "company_id": string;
        };
        ComputedFields: never;
        Insert: {
          "advertisement_id": string;
          "company_id": string;
        };
        Update: {
          "advertisement_id"?: string;
          "company_id"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "advertisements_companies_advertisement_id_fkey";
            columns: [
              "advertisement_id"
            ];
            isOneToOne: false;
            referencedRelation: "advertisements";
            referencedColumns: [
              "id"
            ];
          },
          {
            foreignKeyName: "advertisements_companies_company_id_fkey";
            columns: [
              "company_id"
            ];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: [
              "id"
            ];
          }
        ];
      };
      "audit_logs": {
        Row: {
          "action": string;
          "after_data": Json | null;
          "before_data": Json | null;
          "created_at": string;
          "id": number;
          "record_pk": string;
          "table_name": string;
          "user_email": string | null;
          "user_id": string | null;
        };
        ComputedFields: never;
        Insert: {
          "action": string;
          "after_data"?: Json | null;
          "before_data"?: Json | null;
          "created_at"?: string;
          "id"?: number;
          "record_pk": string;
          "table_name": string;
          "user_email"?: string | null;
          "user_id"?: string | null;
        };
        Update: {
          "action"?: string;
          "after_data"?: Json | null;
          "before_data"?: Json | null;
          "created_at"?: string;
          "id"?: number;
          "record_pk"?: string;
          "table_name"?: string;
          "user_email"?: string | null;
          "user_id"?: string | null;
        };
        Relationships: [
        ];
      };
      "companies": {
        Row: {
          "created_at": string | null;
          "id": string;
          "is_private": boolean | null;
          "name": string;
          "password": string | null;
          "show_clock": boolean;
          "slug": string;
          "transition": string;
          "updated_at": string | null;
        };
        ComputedFields: never;
        Insert: {
          "created_at"?: string | null;
          "id"?: string;
          "is_private"?: boolean | null;
          "name": string;
          "password"?: string | null;
          "show_clock"?: boolean;
          "slug": string;
          "transition"?: string;
          "updated_at"?: string | null;
        };
        Update: {
          "created_at"?: string | null;
          "id"?: string;
          "is_private"?: boolean | null;
          "name"?: string;
          "password"?: string | null;
          "show_clock"?: boolean;
          "slug"?: string;
          "transition"?: string;
          "updated_at"?: string | null;
        };
        Relationships: [
        ];
      };
      "display_heartbeats": {
        Row: {
          "company_id": string;
          "last_seen_at": string;
          "user_agent": string | null;
        };
        ComputedFields: never;
        Insert: {
          "company_id": string;
          "last_seen_at"?: string;
          "user_agent"?: string | null;
        };
        Update: {
          "company_id"?: string;
          "last_seen_at"?: string;
          "user_agent"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "display_heartbeats_company_id_fkey";
            columns: [
              "company_id"
            ];
            isOneToOne: true;
            referencedRelation: "companies";
            referencedColumns: [
              "id"
            ];
          }
        ];
      };
      "display_signals": {
        Row: {
          "company_id": string;
          "updated_at": string;
        };
        ComputedFields: never;
        Insert: {
          "company_id": string;
          "updated_at"?: string;
        };
        Update: {
          "company_id"?: string;
          "updated_at"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "display_signals_company_id_fkey";
            columns: [
              "company_id"
            ];
            isOneToOne: true;
            referencedRelation: "companies";
            referencedColumns: [
              "id"
            ];
          }
        ];
      };
      "error_logs": {
        Row: {
          "context": Json | null;
          "created_at": string;
          "digest": string | null;
          "id": number;
          "message": string;
          "source": string;
          "stack": string | null;
          "url": string | null;
          "user_agent": string | null;
          "user_id": string | null;
        };
        ComputedFields: never;
        Insert: {
          "context"?: Json | null;
          "created_at"?: string;
          "digest"?: string | null;
          "id"?: never;
          "message": string;
          "source": string;
          "stack"?: string | null;
          "url"?: string | null;
          "user_agent"?: string | null;
          "user_id"?: string | null;
        };
        Update: {
          "context"?: Json | null;
          "created_at"?: string;
          "digest"?: string | null;
          "id"?: never;
          "message"?: string;
          "source"?: string;
          "stack"?: string | null;
          "url"?: string | null;
          "user_agent"?: string | null;
          "user_id"?: string | null;
        };
        Relationships: [
        ];
      };
      "profiles": {
        Row: {
          "avatar_url": string | null;
          "full_name": string | null;
          "id": string;
          "role": string;
        };
        ComputedFields: never;
        Insert: {
          "avatar_url"?: string | null;
          "full_name"?: string | null;
          "id": string;
          "role"?: string;
        };
        Update: {
          "avatar_url"?: string | null;
          "full_name"?: string | null;
          "id"?: string;
          "role"?: string;
        };
        Relationships: [
        ];
      };
      "rate_limits": {
        Row: {
          "count": number;
          "key": string;
          "reset_at": string;
        };
        ComputedFields: never;
        Insert: {
          "count"?: number;
          "key": string;
          "reset_at": string;
        };
        Update: {
          "count"?: number;
          "key"?: string;
          "reset_at"?: string;
        };
        Relationships: [
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      "ad_play_report": {
        Args: {
          "p_company_id"?: string;
          "p_from": string;
          "p_to": string;
        };
        Returns: {
          "ad_deleted": boolean;
          "ad_title": string;
          "advertisement_id": string;
          "company_id": string;
          "company_name": string;
          "plays": number;
          "seconds": number;
        }[];
      };
      "consume_rate_limit": {
        Args: {
          "p_key": string;
          "p_limit": number;
          "p_window_seconds": number;
        };
        Returns: {
          "allowed": boolean;
          "retry_after_seconds": number;
        }[];
      };
      "is_admin": {
        Args: {
          "uid": string;
        };
        Returns: boolean;
      };
      "record_ad_plays": {
        Args: {
          "p_company_id": string;
          "p_items": Json;
        };
        Returns: undefined;
      };
      "reorder_advertisements": {
        Args: {
          "p_ids": (string)[];
        };
        Returns: undefined;
      };
      "reset_rate_limit": {
        Args: {
          "p_key": string;
        };
        Returns: undefined;
      };
      "touch_display_signal": {
        Args: {
          "p_company_ids": (string)[];
        };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];
export type Tables<DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | {
  schema: keyof DatabaseWithoutInternals;
}, TableName extends DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
} ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"]) : never = never> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
} ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
  Row: infer R;
} ? R : never : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
  Row: infer R;
} ? R : never : never;
export type TablesInsert<DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | {
  schema: keyof DatabaseWithoutInternals;
}, TableName extends DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
} ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] : never = never> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
  Insert: infer I;
} ? I : never : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
  Insert: infer I;
} ? I : never : never;
export type TablesUpdate<DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | {
  schema: keyof DatabaseWithoutInternals;
}, TableName extends DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
} ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] : never = never> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
  Update: infer U;
} ? U : never : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
  Update: infer U;
} ? U : never : never;
export type Enums<DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | {
  schema: keyof DatabaseWithoutInternals;
}, EnumName extends DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
} ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"] : never = never> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName] : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions] : never;
export type CompositeTypes<PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] | {
  schema: keyof DatabaseWithoutInternals;
}, CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
} ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"] : never = never> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName] : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions] : never;
export const Constants = {
  "public": {
    Enums: {}
  }
} as const;
