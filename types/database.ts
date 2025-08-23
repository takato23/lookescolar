export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      egress_metrics: {
        Row: {
          bytes_served: number | null;
          created_at: string | null;
          date: string;
          event_id: string | null;
          id: string;
          requests_count: number | null;
        };
        Insert: {
          bytes_served?: number | null;
          created_at?: string | null;
          date: string;
          event_id?: string | null;
          id?: string;
          requests_count?: number | null;
        };
        Update: {
          bytes_served?: number | null;
          created_at?: string | null;
          date?: string;
          event_id?: string | null;
          id?: string;
          requests_count?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'egress_metrics_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      events: {
        Row: {
          active: boolean | null;
          created_at: string | null;
          date: string;
          id: string;
          school: string;
          updated_at: string | null;
        };
        Insert: {
          active?: boolean | null;
          created_at?: string | null;
          date: string;
          id?: string;
          school: string;
          updated_at?: string | null;
        };
        Update: {
          active?: boolean | null;
          created_at?: string | null;
          date?: string;
          id?: string;
          school?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      order_audit_log: {
        Row: {
          id: string;
          order_id: string;
          action_type: string;
          old_values: Json | null;
          new_values: Json | null;
          changed_by: string | null;
          changed_by_type: string | null;
          ip_address: string | null;
          user_agent: string | null;
          notes: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          action_type: string;
          old_values?: Json | null;
          new_values?: Json | null;
          changed_by?: string | null;
          changed_by_type?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          notes?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          action_type?: string;
          old_values?: Json | null;
          new_values?: Json | null;
          changed_by?: string | null;
          changed_by_type?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          notes?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'order_audit_log_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'order_audit_log_changed_by_fkey';
            columns: ['changed_by'];
            isOneToOne: false;
            referencedRelation: 'admin_users';
            referencedColumns: ['id'];
          },
        ];
      };
      order_items: {
        Row: {
          created_at: string | null;
          id: string;
          order_id: string;
          photo_id: string;
          price_list_item_id: string;
          quantity: number | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          order_id: string;
          photo_id: string;
          price_list_item_id: string;
          quantity?: number | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          order_id?: string;
          photo_id?: string;
          price_list_item_id?: string;
          quantity?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'order_items_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'order_items_photo_id_fkey';
            columns: ['photo_id'];
            isOneToOne: false;
            referencedRelation: 'photos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'order_items_price_list_item_id_fkey';
            columns: ['price_list_item_id'];
            isOneToOne: false;
            referencedRelation: 'price_list_items';
            referencedColumns: ['id'];
          },
        ];
      };
      orders: {
        Row: {
          created_at: string | null;
          customer_email: string | null;
          customer_name: string | null;
          customer_phone: string | null;
          event_id: string;
          id: string;
          mp_payment_id: string | null;
          notes: string | null;
          status: string | null;
          subject_id: string;
          total_cents: number;
          updated_at: string | null;
          // Enhanced audit and tracking fields
          status_history: Json | null;
          last_status_change: string | null;
          status_changed_by: string | null;
          admin_notes: string | null;
          estimated_delivery_date: string | null;
          actual_delivery_date: string | null;
          delivery_method: string | null;
          tracking_number: string | null;
          priority_level: number | null;
        };
        Insert: {
          created_at?: string | null;
          customer_email?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          event_id: string;
          id?: string;
          mp_payment_id?: string | null;
          notes?: string | null;
          status?: string | null;
          subject_id: string;
          total_cents: number;
          updated_at?: string | null;
          // Enhanced audit and tracking fields
          status_history?: Json | null;
          last_status_change?: string | null;
          status_changed_by?: string | null;
          admin_notes?: string | null;
          estimated_delivery_date?: string | null;
          actual_delivery_date?: string | null;
          delivery_method?: string | null;
          tracking_number?: string | null;
          priority_level?: number | null;
        };
        Update: {
          created_at?: string | null;
          customer_email?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          event_id?: string;
          id?: string;
          mp_payment_id?: string | null;
          notes?: string | null;
          status?: string | null;
          subject_id?: string;
          total_cents?: number;
          updated_at?: string | null;
          // Enhanced audit and tracking fields
          status_history?: Json | null;
          last_status_change?: string | null;
          status_changed_by?: string | null;
          admin_notes?: string | null;
          estimated_delivery_date?: string | null;
          actual_delivery_date?: string | null;
          delivery_method?: string | null;
          tracking_number?: string | null;
          priority_level?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'orders_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      payments: {
        Row: {
          amount_cents: number;
          created_at: string | null;
          id: string;
          mp_external_reference: string | null;
          mp_payment_id: string;
          mp_payment_type: string | null;
          mp_preference_id: string | null;
          mp_status: string;
          mp_status_detail: string | null;
          order_id: string;
          processed_at: string | null;
          updated_at: string | null;
          webhook_data: Json | null;
        };
        Insert: {
          amount_cents: number;
          created_at?: string | null;
          id?: string;
          mp_external_reference?: string | null;
          mp_payment_id: string;
          mp_payment_type?: string | null;
          mp_preference_id?: string | null;
          mp_status?: string;
          mp_status_detail?: string | null;
          order_id: string;
          processed_at?: string | null;
          updated_at?: string | null;
          webhook_data?: Json | null;
        };
        Update: {
          amount_cents?: number;
          created_at?: string | null;
          id?: string;
          mp_external_reference?: string | null;
          mp_payment_id?: string;
          mp_payment_type?: string | null;
          mp_preference_id?: string | null;
          mp_status?: string;
          mp_status_detail?: string | null;
          order_id?: string;
          processed_at?: string | null;
          updated_at?: string | null;
          webhook_data?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
        ];
      };
      photo_subjects: {
        Row: {
          created_at: string | null;
          id: string;
          photo_id: string;
          subject_id: string;
          tagged_at: string | null;
          tagged_by: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          photo_id: string;
          subject_id: string;
          tagged_at?: string | null;
          tagged_by?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          photo_id?: string;
          subject_id?: string;
          tagged_at?: string | null;
          tagged_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'photo_subjects_photo_id_fkey';
            columns: ['photo_id'];
            isOneToOne: false;
            referencedRelation: 'photos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'photo_subjects_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'photo_subjects_tagged_by_fkey';
            columns: ['tagged_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      photos: {
        Row: {
          approved: boolean | null;
          created_at: string | null;
          event_id: string;
          file_size_bytes: number | null;
          filename: string;
          id: string;
          metadata: Json | null;
          storage_path: string;
          uploaded_at: string | null;
        };
        Insert: {
          approved?: boolean | null;
          created_at?: string | null;
          event_id: string;
          file_size_bytes?: number | null;
          filename: string;
          id?: string;
          metadata?: Json | null;
          storage_path: string;
          uploaded_at?: string | null;
        };
        Update: {
          approved?: boolean | null;
          created_at?: string | null;
          event_id?: string;
          file_size_bytes?: number | null;
          filename?: string;
          id?: string;
          metadata?: Json | null;
          storage_path?: string;
          uploaded_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'photos_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      price_list_items: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: string;
          name: string;
          price_cents: number;
          price_list_id: string;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          price_cents: number;
          price_list_id: string;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          price_cents?: number;
          price_list_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'price_list_items_price_list_id_fkey';
            columns: ['price_list_id'];
            isOneToOne: false;
            referencedRelation: 'price_lists';
            referencedColumns: ['id'];
          },
        ];
      };
      price_lists: {
        Row: {
          created_at: string | null;
          event_id: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string | null;
          event_id: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string | null;
          event_id?: string;
          id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'price_lists_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      subject_tokens: {
        Row: {
          created_at: string | null;
          expires_at: string;
          id: string;
          subject_id: string;
          token: string;
        };
        Insert: {
          created_at?: string | null;
          expires_at: string;
          id?: string;
          subject_id: string;
          token: string;
        };
        Update: {
          created_at?: string | null;
          expires_at?: string;
          id?: string;
          subject_id?: string;
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subject_tokens_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      subjects: {
        Row: {
          created_at: string | null;
          event_id: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string | null;
          event_id: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string | null;
          event_id?: string;
          id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subjects_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      assign_photo_to_subject: {
        Args: {
          photo_uuid: string;
          subject_uuid: string;
          admin_user_id?: string;
        };
        Returns: string;
      };
      calculate_order_total: {
        Args: {
          order_uuid: string;
        };
        Returns: number;
      };
      get_subject_photos: {
        Args: {
          subject_uuid: string;
        };
        Returns: {
          approved: boolean | null;
          created_at: string | null;
          event_id: string;
          file_size_bytes: number | null;
          filename: string;
          id: string;
          metadata: Json | null;
          storage_path: string;
          uploaded_at: string | null;
        }[];
      };
      update_egress_metrics: {
        Args: {
          p_event_id: string;
          p_bytes_served: number;
          p_requests_count?: number;
        };
        Returns: undefined;
      };
      validate_family_token: {
        Args: {
          token_value: string;
        };
        Returns: string;
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

type PublicSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] &
        PublicSchema['Views'])
    ? (PublicSchema['Tables'] &
        PublicSchema['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema['Enums']
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
    ? PublicSchema['Enums'][PublicEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema['CompositeTypes']
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema['CompositeTypes']
    ? PublicSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;
